import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Button, Badge, Form, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getAvatarShop, purchaseAvatarItem, equipAvatarItem } from "../../lib/api";
import "./Shop.css";
import Navbar from "../../components/Navbar";

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const NEW_DAYS = 3;

function parseDateMaybe(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isNewByCreatedAt(item) {
  const created =
    parseDateMaybe(item?.created_at) ||
    parseDateMaybe(item?.createdAt) ||
    parseDateMaybe(item?.added_at) ||
    parseDateMaybe(item?.addedAt) ||
    null;

  if (!created) return false;
  return Date.now() - created.getTime() <= NEW_DAYS * MS_IN_DAY;
}

function getTier(price) {
  if (price >= 300) return "legendary";
  if (price >= 200) return "epic";
  if (price >= 100) return "rare";
  if (price > 0) return "common";
  return "free";
}

function getTierClass(price) {
  return `tier-${getTier(price)}`;
}

function getTierLabel(price) {
  const t = getTier(price);
  if (t === "legendary") return "Legendary";
  if (t === "epic") return "Epic";
  if (t === "rare") return "Rare";
  if (t === "common") return "Common";
  return "Free";
}

// ✅ tier order: free -> common -> rare -> epic -> legendary
const TIER_ORDER = {
  free: 0,
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export default function AvatarShop() {
  const [busyId, setBusyId] = useState(null);
  const [justBoughtId, setJustBoughtId] = useState(null);

  const navigate = useNavigate();

  const [xp, setXp] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return Number(user?.xp_balance ?? 0) || 0;
  });

  const [activeAvatarItemId, setActiveAvatarItemId] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.active_avatar_item_id ?? null;
  });

  const [loadingShop, setLoadingShop] = useState(true);

  const [category, setCategory] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [query, setQuery] = useState("");

  const [itemsRaw, setItemsRaw] = useState([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingShop(true);

        const res = await getAvatarShop();
        const data = res?.data;

        if (!mounted) return;

        const balance = Number(data?.balance ?? 0) || 0;
        setXp(balance);

        setActiveAvatarItemId(data?.active_avatar_item_id ?? null);

        setItemsRaw(Array.isArray(data?.items) ? data.items : []);

        const oldUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...oldUser,
            xp_balance: balance,
            active_avatar_item_id:
              data?.active_avatar_item_id ?? oldUser?.active_avatar_item_id ?? null,
          })
        );
        window.dispatchEvent(new Event("auth-changed"));
        window.dispatchEvent(new Event("xp-updated"));
      } catch (e) {
        console.warn(
          "AvatarShop: failed to load shop",
          e?.response?.status,
          e?.response?.data || e?.message
        );
      } finally {
        if (mounted) setLoadingShop(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ Filter + Sort
  const items = useMemo(() => {
    const filtered = itemsRaw.filter((i) => {
      if (category !== "all" && i.type !== category) return false;

      const price = Number(i?.price_xp ?? 0) || 0;
      const t = getTier(price);
      if (tierFilter !== "all" && t !== tierFilter) return false;

      if (query && !String(i.name || "").toLowerCase().includes(query.toLowerCase())) return false;

      return true;
    });

    // ✅ Sort logic:
    // 1) Owned first
    // 2) Within owned: tier order (free -> common -> rare -> epic -> legendary)
    // 3) Not owned: tier order too
    // 4) Stable fallback by original index
    return filtered
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => {
        const A = a.item;
        const B = b.item;

        const aOwned = A?.owned ? 1 : 0;
        const bOwned = B?.owned ? 1 : 0;
        if (aOwned !== bOwned) return bOwned - aOwned;

        const aTier = getTier(Number(A?.price_xp ?? 0) || 0);
        const bTier = getTier(Number(B?.price_xp ?? 0) || 0);

        const aTierRank = TIER_ORDER[aTier] ?? 999;
        const bTierRank = TIER_ORDER[bTier] ?? 999;

        if (aTierRank !== bTierRank) return aTierRank - bTierRank;

        return a.idx - b.idx;
      })
      .map((x) => x.item);
  }, [itemsRaw, category, query, tierFilter]);

  const updateLocalStorage = (balance, activeId) => {
    const oldUser = JSON.parse(localStorage.getItem("user") || "{}");
    localStorage.setItem(
      "user",
      JSON.stringify({
        ...oldUser,
        xp_balance: balance,
        active_avatar_item_id: activeId ?? oldUser?.active_avatar_item_id ?? null,
      })
    );
    window.dispatchEvent(new Event("auth-changed"));
    window.dispatchEvent(new Event("xp-updated"));
  };

  const buy = async (item) => {
    if (!item?.id) return;

    const price = Number(item?.price_xp ?? 0) || 0;

    try {
      setBusyId(item.id);

      const newBalance = xp - price;
      setXp(newBalance);
      updateLocalStorage(newBalance, activeAvatarItemId);

      // ✅ optimistic ownership
      setItemsRaw((prev) => prev.map((i) => (i.id === item.id ? { ...i, owned: true } : i)));

      await purchaseAvatarItem(item.id);

      setJustBoughtId(item.id);
      window.setTimeout(() => setJustBoughtId(null), 1200);

      const res = await getAvatarShop();
      const data = res?.data;

      const balance = Number(data?.balance ?? 0) || 0;
      setXp(balance);
      setActiveAvatarItemId(data?.active_avatar_item_id ?? null);
      setItemsRaw(Array.isArray(data?.items) ? data.items : []);
      updateLocalStorage(balance, data?.active_avatar_item_id);
    } catch (e) {
      console.warn("AvatarShop: purchase failed", e?.response?.status, e?.response?.data || e?.message);
      alert(e?.response?.data?.message || "Purchase failed");

      const res = await getAvatarShop();
      const data = res?.data;

      const balance = Number(data?.balance ?? 0) || 0;
      setXp(balance);
      setItemsRaw(Array.isArray(data?.items) ? data.items : []);
      updateLocalStorage(balance, data?.active_avatar_item_id);
    } finally {
      setBusyId(null);
    }
  };

  const equip = async (item) => {
    try {
      setActiveAvatarItemId(item.id);

      setItemsRaw((prev) =>
        prev.map((i) => ({
          ...i,
          equipped: i.id === item.id,
        }))
      );

      updateLocalStorage(xp, item.id);

      const res = await equipAvatarItem(item.id);
      const data = res?.data;

      const nextActiveId = data?.active_avatar_item_id ?? item.id;
      setActiveAvatarItemId(nextActiveId);

      const oldUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...oldUser,
          active_avatar_item_id: nextActiveId,
          active_avatar_image_url: data?.active_avatar_image_url ?? oldUser?.active_avatar_image_url ?? null,
        })
      );

      window.dispatchEvent(new Event("auth-changed"));

      const shopRes = await getAvatarShop();
      const shopData = shopRes?.data;
      setItemsRaw(Array.isArray(shopData?.items) ? shopData.items : []);
    } catch (e) {
      console.warn("AvatarShop: equip failed", e?.response?.status, e?.response?.data || e?.message);
      alert(e?.response?.data?.message || "Equip failed");

      const res = await getAvatarShop();
      const data = res?.data;

      setActiveAvatarItemId(data?.active_avatar_item_id ?? null);
      setItemsRaw(Array.isArray(data?.items) ? data.items : []);
    }
  };

  const showGridLoading = loadingShop && (!itemsRaw || itemsRaw.length === 0);

  return (
    <>
      <Navbar />

      <div className="shop-bg">
        <Container className="shop-wrap">
          {/* Header */}
          <div className="shop-header">
            <div>
              <div className="shop-kicker">🛒 Shop</div>
              <div className="shop-title">
                Avatar <span>Shop</span>
              </div>
              <div className="shop-subtitle">Spend XP to unlock items. More item types coming soon.</div>
            </div>

            <div className="shop-header-actions">
              <Button variant="outline-light" onClick={() => navigate("/my-items")}>
                My Items
              </Button>
              <Button variant="outline-primary" onClick={() => navigate("/profile")}>
                Profile
              </Button>
            </div>
          </div>

          {/* Top bar */}
          <div className="shop-top">
            <Card className="shop-glass shop-xp-card">
              <div className="shop-xp-row">
                <div className="shop-xp-left">
                  <div className="shop-xp-label">XP Balance</div>
                  <div className="shop-xp-value">
                    {loadingShop && xp === 0 ? (
                      <>
                        <Spinner animation="border" size="sm" />
                        <span className="shop-xp-loading">Loading…</span>
                      </>
                    ) : (
                      xp
                    )}
                  </div>
                </div>

                <div className="shop-xp-right">
                  <Badge className="shop-badge" bg="dark">
                    {xp >= 500 ? "🔥 Ready to shop" : "Keep learning"}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="shop-glass shop-filter-card">
              <div className="shop-filter-row">
                <div className={`shop-chip ${category === "all" ? "active" : ""}`} onClick={() => setCategory("all")}>
                  All
                </div>
                <div className={`shop-chip ${category === "avatar" ? "active" : ""}`} onClick={() => setCategory("avatar")}>
                  Avatars
                </div>
                <div className="shop-chip disabled" title="Coming soon">
                  Frames
                </div>
                <div className="shop-chip disabled" title="Coming soon">
                  Badges
                </div>

                <Form.Select
                  className="shop-search"
                  style={{ maxWidth: 220, marginLeft: 0 }}
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  aria-label="Filter by tier"
                >
                  <option value="all">All tiers</option>
                  <option value="free">Free</option>
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </Form.Select>

                <Form.Control
                  className="shop-search"
                  placeholder="Search items…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </Card>
          </div>

          {/* Items */}
          <Row className="g-3">
            {showGridLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <Col key={`sk-${idx}`} xs={12} sm={6} md={4} lg={3}>
                  <Card className="shop-item">
                    <div className="shop-item-top shop-skel-top">
                      <div className="shop-skel-ring" />
                    </div>
                    <div className="shop-item-body shop-skel-body">
                      <div className="shop-skel-line" />
                      <div className="shop-skel-line small" />

                      <div className="shop-loadingWord" aria-label="Loading">
                        <span className="l">L</span>
                        <span className="o">O</span>
                        <span className="a">A</span>
                        <span className="d">D</span>
                        <span className="i">I</span>
                        <span className="n">N</span>
                        <span className="g">G</span>
                        <span className="d1">.</span>
                        <span className="d2">.</span>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))
            ) : (
              items.map((item) => {
                const isOwned = !!item.owned;
                const isEquipped = !!item.equipped || activeAvatarItemId === item.id;
                const price = Number(item.price_xp ?? 0) || 0;
                const canAfford = xp >= price;

                const img = item.image_url || "/avatars/a1.png";
                const tierLabel = getTierLabel(price);
                const tierClass = getTierClass(price);
                const showNew = !isOwned && isNewByCreatedAt(item);

                const isBuying = busyId === item.id;

                return (
                  <Col key={item.id} xs={12} sm={6} md={4} lg={3}>
                    <Card className={`shop-item ${justBoughtId === item.id ? "shop-unlock" : ""}`}>
                      <div className="shop-item-top">
                        {showNew ? (
                          <div className="shop-tag new">New</div>
                        ) : (
                          <div className={`shop-tag ${isEquipped ? "equipped" : isOwned ? "owned" : "new"}`}>
                            {isEquipped ? "Equipped" : isOwned ? "Owned" : " "}
                          </div>
                        )}

                        <div className={`shop-tier-badge ${tierClass}`}>{tierLabel}</div>

                        <div className={`shop-avatar-ring ${tierClass}`}>
                          <img
                            src={img}
                            alt={item.name}
                            onError={(e) => {
                              e.currentTarget.src = "/avatars/a1.png";
                            }}
                          />
                        </div>
                      </div>

                      <div className="shop-item-body">
                        <div className="shop-item-name">{item.name}</div>

                        <div className={`shop-item-meta ${isOwned ? "hidden-price" : ""}`}>
                          <div className="shop-price">
                            Price: <b>{price} XP</b>
                          </div>
                        </div>

                        {!isOwned ? (
                          <button
                            type="button"
                            className="shopBuyBtnLuxury"
                            disabled={!canAfford || loadingShop || isBuying}
                            onClick={() => buy(item)}
                            aria-label="Buy now"
                            title={!canAfford ? "Not enough XP" : "Buy now"}
                          >
                            <svg
                              viewBox="0 0 16 16"
                              className="shopBuyIcon"
                              height="24"
                              width="24"
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden="true"
                            >
                              <path d="M11.354 6.354a.5.5 0 0 0-.708-.708L8 8.293 6.854 7.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z"></path>
                              <path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1H.5zm3.915 10L3.102 4h10.796l-1.313 7h-8.17zM6 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm7 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"></path>
                            </svg>

                            <span className="shopBuyText">
                              {isBuying ? "Buying..." : canAfford ? "Buy Now" : "Not enough XP"}
                            </span>
                          </button>
                        ) : (
                          <Button
                            className="w-100"
                            variant={isEquipped ? "outline-success" : "success"}
                            disabled={isEquipped}
                            onClick={() => equip(item)}
                          >
                            {isEquipped ? "Equipped" : "Equip"}
                          </Button>
                        )}
                      </div>
                    </Card>
                  </Col>
                );
              })
            )}
          </Row>

          {/* Footer */}
          <Card className="shop-glass shop-footer">
            <div className="shop-footer-title">Coming soon</div>
            <div className="shop-footer-text">
              Frames, badges, themes, and more cosmetics will appear here later. Filament will control items & prices.
            </div>
          </Card>
        </Container>
      </div>
    </>
  );
}
