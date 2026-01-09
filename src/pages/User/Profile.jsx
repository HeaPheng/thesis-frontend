import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Modal, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import api, { getAvatarShop, equipAvatarItem } from "../../lib/api";
import "./User.css";

function initialsFromName(n = "") {
  const parts = n.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "S";
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function pickXp(u) {
  const v = u?.xp_balance ?? u?.xpBalance ?? u?.xp ?? u?.xp_points ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function Profile() {
  const navigate = useNavigate();

  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "en");
  useEffect(() => {
    const onLang = (e) => {
      const next = e?.detail?.lang || localStorage.getItem("app_lang") || "en";
      setLang(next === "km" ? "km" : "en");
    };
    window.addEventListener("app-lang-changed", onLang);
    return () => window.removeEventListener("app-lang-changed", onLang);
  }, []);

  const ui = useMemo(() => {
    if (lang === "km") {
      return {
        title: "ប្រវត្តិរូប",
        sub: "កែប្រែព័ត៌មានគណនីរបស់អ្នក",
        home: "ទំព័រដើម",
        loading: "កំពុងផ្ទុកប្រវត្តិរូប…",
        loadFailed: "មិនអាចផ្ទុកប្រវត្តិរូបបានទេ។",
        sideHint: "ប្រវត្តិរូបរបស់អ្នកត្រូវបានរក្សាទុកក្នុងមូលដ្ឋានទិន្នន័យ (Sanctum account).",
        student: "សិស្ស",
        studentEmail: "student@example.com",
        accountDetails: "ព័ត៌មានគណនី",
        fullName: "ឈ្មោះពេញ",
        yourName: "ឈ្មោះរបស់អ្នក",
        email: "អ៊ីមែល",
        emailHint: "បច្ចុប្បន្នអ៊ីមែលមិនអាចកែប្រែបានទេ។",
        save: "រក្សាទុក",
        saving: "កំពុងរក្សាទុក…",
        savedOk: "បានធ្វើបច្ចុប្បន្នភាពប្រវត្តិរូប ✅",
        saveFailed: "មិនអាចធ្វើបច្ចុប្បន្នភាពប្រវត្តិរូបបានទេ។",
        security: "សុវត្ថិភាព",
        securitySub: "ប្តូរពាក្យសម្ងាត់ដោយសុវត្ថិភាព។",
        currentPass: "ពាក្យសម្ងាត់បច្ចុប្បន្ន",
        newPass: "ពាក្យសម្ងាត់ថ្មី",
        confirmNewPass: "បញ្ជាក់ពាក្យសម្ងាត់ថ្មី",
        currentPassPh: "ពាក្យសម្ងាត់បច្ចុប្បន្ន",
        newPassPh: "ពាក្យសម្ងាត់ថ្មី",
        confirmNewPassPh: "បញ្ជាក់ពាក្យសម្ងាត់ថ្មី",
        passNoMatch: "ពាក្យសម្ងាត់ថ្មី និងការបញ្ជាក់មិនត្រូវគ្នា។",
        passUpdated: "បានប្តូរពាក្យសម្ងាត់ ✅",
        passUpdateFailed: "មិនអាចប្តូរពាក្យសម្ងាត់បានទេ។",
        updating: "កំពុងធ្វើបច្ចុប្បន្នភាព…",
        updatePass: "ប្តូរពាក្យសម្ងាត់",
        validationErr: "កំហុសបញ្ជាក់។ សូមពិនិត្យព័ត៌មានដែលបានបញ្ចូល។",
        avatarTitle: "រូបតំណាង",
        avatarSub: "ជ្រើសរើសរូបតំណាងដែលអ្នកបានទិញ (Owned).",
        chooseAvatar: "ជ្រើសរើសរូបតំណាង",
        savingAvatar: "កំពុងរក្សាទុក…",
        avatarSaved: "បានប្តូររូបតំណាង ✅",
        avatarFailed: "មិនអាចប្តូររូបតំណាងបានទេ។",
        confirm: "បញ្ជាក់",
        cancel: "បោះបង់",
        pickOne: "សូមជ្រើសរើសរូបតំណាងមួយ។",
        xpBalance: "XP សរុប",
        goShop: "ទៅកាន់ Avatar Shop",
        noOwnedAvatars: "អ្នកមិនទាន់មានរូបតំណាងដែលបានទិញទេ។ សូមទៅ Shop ជាមុន។",
      };
    }

    return {
      title: "Profile",
      sub: "Update your account information",
      home: "Home",
      loading: "Loading profile…",
      loadFailed: "Failed to load profile.",
      sideHint: "Your profile is saved in the database (Sanctum account).",
      student: "Student",
      studentEmail: "student@example.com",
      accountDetails: "Account details",
      fullName: "Full name",
      yourName: "Your name",
      email: "Email",
      emailHint: "Email change is currently disabled.",
      save: "Save",
      saving: "Saving…",
      savedOk: "Profile updated ✅",
      saveFailed: "Failed to update profile.",
      security: "Security",
      securitySub: "Change your password securely.",
      currentPass: "Current password",
      newPass: "New password",
      confirmNewPass: "Confirm new password",
      currentPassPh: "Current password",
      newPassPh: "New password",
      confirmNewPassPh: "Confirm new password",
      passNoMatch: "New password and confirmation do not match.",
      passUpdated: "Password updated ✅",
      passUpdateFailed: "Failed to update password.",
      updating: "Updating…",
      updatePass: "Update password",
      validationErr: "Validation error. Please check inputs.",
      avatarTitle: "Avatar",
      avatarSub: "Pick an avatar you OWN (purchased).",
      chooseAvatar: "Choose avatar",
      savingAvatar: "Saving…",
      avatarSaved: "Avatar updated ✅",
      avatarFailed: "Failed to update avatar.",
      confirm: "Confirm",
      cancel: "Cancel",
      pickOne: "Please select an avatar.",
      xpBalance: "XP Balance",
      goShop: "Go to Avatar Shop",
      noOwnedAvatars: "You don't own any avatars yet. Go to the Shop first.",
    };
  }, [lang]);

  const [loading, setLoading] = useState(false); // ✅ Start as false, load from cache first

  // ✅ Load from localStorage immediately for instant display
  const [name, setName] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u?.name || "";
    } catch {
      return "";
    }
  });

  const [email, setEmail] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u?.email || "";
    } catch {
      return "";
    }
  });

  const [xpBalance, setXpBalance] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return pickXp(u);
    } catch {
      return 0;
    }
  });

  const [activeAvatarItemId, setActiveAvatarItemId] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u?.active_avatar_item_id ?? null;
    } catch {
      return null;
    }
  });

  const [activeAvatarUrl, setActiveAvatarUrl] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u?.active_avatar_image_url ?? null;
    } catch {
      return null;
    }
  });

  const [shopItems, setShopItems] = useState([]);
  const ownedAvatars = useMemo(() => {
    return (shopItems || []).filter((x) => x.type === "avatar" && x.owned);
  }, [shopItems]);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  // Avatar modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [pendingAvatarItemId, setPendingAvatarItemId] = useState(null);

  const mergeUserToLocalStorage = useCallback((patch) => {
    const oldUser = JSON.parse(localStorage.getItem("user") || "{}");
    localStorage.setItem("user", JSON.stringify({ ...oldUser, ...patch }));
    window.dispatchEvent(new Event("auth-changed"));
  }, []);

  const refreshShop = useCallback(async () => {
    try {
      const res = await getAvatarShop();
      const data = res?.data;

      const balance = Number(data?.balance ?? 0) || 0;
      setXpBalance(balance);

      const activeId = data?.active_avatar_item_id ?? null;
      setActiveAvatarItemId(activeId);

      const items = Array.isArray(data?.items) ? data.items : [];
      setShopItems(items);

      const equippedItem = items.find((it) => it.id === activeId);
      const nextUrl = equippedItem?.image_url ?? null;
      setActiveAvatarUrl(nextUrl);

      mergeUserToLocalStorage({
        xp_balance: balance,
        active_avatar_item_id: activeId,
        active_avatar_image_url: nextUrl,
      });

      window.dispatchEvent(new Event("xp-updated"));
    } catch (e) {
      console.warn("[Profile] refreshShop failed:", e);
      // Don't block UI - shop data is optional
    }
  }, [mergeUserToLocalStorage]);

  // ✅ Load profile + shop IN PARALLEL (not sequential)
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setMsg(null);
      setErr(null);

      try {
        // ✅ Fire both requests at the same time
        const [profileRes] = await Promise.allSettled([
          api.get("/profile"),
          refreshShop(), // Runs in parallel
        ]);

        if (!mounted) return;

        // Handle profile response
        if (profileRes.status === "fulfilled") {
          const u = profileRes.value?.data?.user ?? profileRes.value?.data;
          
          setName(u?.name || "");
          setEmail(u?.email || "");
          setXpBalance(pickXp(u));
          setActiveAvatarItemId(u?.active_avatar_item_id ?? null);
          setActiveAvatarUrl(u?.active_avatar_image_url ?? null);

          mergeUserToLocalStorage({ ...u });
        } else {
          console.warn("[Profile] load failed:", profileRes.reason);
          setErr(profileRes.reason?.response?.data?.message || ui.loadFailed);
        }

        // Shop data already handled in refreshShop()
      } catch (e) {
        if (!mounted) return;
        console.warn("[Profile] unexpected error:", e);
        setErr(e?.response?.data?.message || ui.loadFailed);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [mergeUserToLocalStorage, refreshShop, ui.loadFailed]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    setSavingProfile(true);
    try {
      const { data } = await api.put("/profile", { name });
      const u = data?.user ?? data;

      setName(u?.name ?? name);
      setEmail(u?.email ?? email);

      mergeUserToLocalStorage(u);
      setMsg(ui.savedOk);
    } catch (e2) {
      setErr(e2?.response?.data?.message || ui.saveFailed);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (password !== passwordConfirmation) {
      setErr(ui.passNoMatch);
      return;
    }

    setSavingPassword(true);
    try {
      await api.put("/profile/password", {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });

      setMsg(ui.passUpdated);
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
    } catch (e2) {
      const message =
        e2?.response?.data?.message ||
        (e2?.response?.data?.errors ? ui.validationErr : ui.passUpdateFailed);
      setErr(message);
    } finally {
      setSavingPassword(false);
    }
  };

  const openAvatarModal = () => {
    setErr(null);
    if (!ownedAvatars.length) {
      setErr(ui.noOwnedAvatars);
      return;
    }
    setPendingAvatarItemId(activeAvatarItemId ?? ownedAvatars[0]?.id ?? null);
    setShowAvatarModal(true);
  };

  const closeAvatarModal = () => {
    setShowAvatarModal(false);
    setPendingAvatarItemId(null);
  };

  const confirmAvatar = async () => {
    setMsg(null);
    setErr(null);

    if (!pendingAvatarItemId) {
      setErr(ui.pickOne);
      return;
    }
    if (pendingAvatarItemId === activeAvatarItemId) {
      closeAvatarModal();
      return;
    }

    try {
      setSavingAvatar(true);

      const res = await equipAvatarItem(pendingAvatarItemId);
      const data = res?.data;

      const nextActiveId = data?.active_avatar_item_id ?? pendingAvatarItemId;
      const nextUrl = data?.active_avatar_image_url ?? null;

      setActiveAvatarItemId(nextActiveId);
      setActiveAvatarUrl(nextUrl);

      mergeUserToLocalStorage({
        active_avatar_item_id: nextActiveId,
        active_avatar_image_url: nextUrl,
      });

      await refreshShop();

      setMsg(ui.avatarSaved);
      setShowAvatarModal(false);
    } catch (e) {
      setErr(e?.response?.data?.message || ui.avatarFailed);
    } finally {
      setSavingAvatar(false);
    }
  };

  const selectedAvatarSrc = activeAvatarUrl || null;

  return (
    <div className="user-page">
      <Container className="user-container">
        <div className="user-header d-flex align-items-start justify-content-between gap-3">
          <div>
            <h2 className="user-title">{ui.title}</h2>
            <div className="user-sub">{ui.sub}</div>
          </div>

          <Button variant="outline-primary" onClick={() => navigate("/dashboard")}>
            {ui.home}
          </Button>
        </div>

        {msg && <Alert variant="success">{msg}</Alert>}
        {err && <Alert variant="danger">{err}</Alert>}

        {/* ✅ Show skeleton only on first load if no cached data */}
        {loading && !name && !email ? (
          <Card className="user-card user-panel">
            <div className="d-flex align-items-center gap-2">
              <Spinner animation="border" size="sm" />
              <div>{ui.loading}</div>
            </div>
          </Card>
        ) : (
          <Row className="g-4">
            <Col lg={4}>
              <Card className="user-card user-side">
                <div className="user-avatar" aria-label="User avatar">
                  <div className="profile-avatar-ring">
                    <div className="profile-avatar">
                      {selectedAvatarSrc ? (
                        <img src={selectedAvatarSrc} alt="avatar" />
                      ) : (
                        <div className="profile-avatar-initials">
                          {initialsFromName(name || ui.student)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="user-side-name">{name || ui.student}</div>
                <div className="user-side-email">{email || ui.studentEmail}</div>

                <div className="mt-3 d-flex align-items-center justify-content-center gap-2 flex-wrap">
                  <Badge bg="dark" style={{ border: "1px solid rgba(255,255,255,.15)" }}>
                    {ui.xpBalance}: <b style={{ marginLeft: 6 }}>{xpBalance}</b>
                  </Badge>
                </div>
                <Button variant="outline-light" onClick={() => navigate("/xp-history")}>
                  XP History
                </Button>

                <div className="user-side-hint mt-3">{ui.sideHint}</div>

                <div className="mt-3 d-flex gap-2 justify-content-center flex-wrap">
                  <Button variant="outline-light" onClick={openAvatarModal}>
                    {ui.chooseAvatar}
                  </Button>

                  <Button variant="success" onClick={() => navigate("/shop")}>
                    {ui.goShop}
                  </Button>
                </div>
              </Card>
            </Col>

            <Col lg={8}>
              <Card className="user-card user-panel">
                <h4 className="user-panel-title">{ui.accountDetails}</h4>

                <Form onSubmit={handleSave}>
                  <Form.Group className="mb-3">
                    <Form.Label className="user-label">{ui.fullName}</Form.Label>
                    <Form.Control
                      className="user-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={ui.yourName}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="user-label">{ui.email}</Form.Label>
                    <Form.Control className="user-input" value={email} placeholder={ui.email} type="email" disabled />
                    <div className="user-muted mt-1">{ui.emailHint}</div>
                  </Form.Group>

                  <div className="user-actions">
                    <Button type="submit" variant="success" disabled={savingProfile}>
                      {savingProfile ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {ui.saving}
                        </>
                      ) : (
                        ui.save
                      )}
                    </Button>
                  </div>
                </Form>
              </Card>

              <Card className="user-card user-panel mt-3">
                <h4 className="user-panel-title">{ui.security}</h4>
                <div className="user-muted">{ui.securitySub}</div>

                <Form onSubmit={handleChangePassword} className="mt-3">
                  <Form.Group className="mb-3">
                    <Form.Label className="user-label">{ui.currentPass}</Form.Label>
                    <Form.Control
                      className="user-input"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={ui.currentPassPh}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="user-label">{ui.newPass}</Form.Label>
                    <Form.Control
                      className="user-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={ui.newPassPh}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="user-label">{ui.confirmNewPass}</Form.Label>
                    <Form.Control
                      className="user-input"
                      type="password"
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      placeholder={ui.confirmNewPassPh}
                    />
                  </Form.Group>

                  <div className="user-actions">
                    <Button type="submit" variant="outline-light" disabled={savingPassword}>
                      {savingPassword ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          {ui.updating}
                        </>
                      ) : (
                        ui.updatePass
                      )}
                    </Button>
                  </div>
                </Form>
              </Card>
            </Col>
          </Row>
        )}
      </Container>

      {/* Avatar modal */}
      <Modal show={showAvatarModal} onHide={closeAvatarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{ui.avatarTitle}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="user-muted mb-3">{ui.avatarSub}</div>

          <div className="avatar-grid">
            {ownedAvatars.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`avatar-item ${pendingAvatarItemId === a.id ? "active" : ""}`}
                onClick={() => setPendingAvatarItemId(a.id)}
                disabled={savingAvatar}
                title={a.name}
              >
                <img src={a.image_url || "/avatars/a1.png"} alt={a.name} />
              </button>
            ))}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={closeAvatarModal} disabled={savingAvatar}>
            {ui.cancel}
          </Button>

          <Button
            variant="primary"
            onClick={confirmAvatar}
            disabled={savingAvatar || !pendingAvatarItemId || pendingAvatarItemId === activeAvatarItemId}
          >
            {savingAvatar ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {ui.savingAvatar}
              </>
            ) : (
              ui.confirm
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}