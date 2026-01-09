import React, { useEffect, useState } from "react";
import { Container, Card, Table, Badge, Spinner, Button, Alert, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getXpTransactions } from "../../lib/api";

function fmtDate(iso) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function amtBadge(amount) {
  const n = Number(amount || 0);
  if (n > 0) return <Badge bg="success">+{n}</Badge>;
  if (n < 0) return <Badge bg="danger">{n}</Badge>;
  return <Badge bg="secondary">{n}</Badge>;
}

export default function XpHistory() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [xp, setXp] = useState(0);
  const [rows, setRows] = useState([]);

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage] = useState(20);

  const [source, setSource] = useState("");

  const refresh = async (nextPage = page, nextSource = source) => {
    const res = await getXpTransactions({
      page: nextPage,
      per_page: perPage,
      source: nextSource || undefined,
    });

    const data = res?.data;
    const balance = Number(data?.xp_balance ?? 0) || 0;

    const paged = data?.items;
    const list = Array.isArray(paged?.data) ? paged.data : [];

    setXp(balance);
    setRows(list);
    setPage(Number(paged?.current_page ?? nextPage) || nextPage);
    setLastPage(Number(paged?.last_page ?? 1) || 1);

    // keep Navbar in sync
    const oldUser = JSON.parse(localStorage.getItem("user") || "{}");
    localStorage.setItem("user", JSON.stringify({ ...oldUser, xp_balance: balance }));
    window.dispatchEvent(new Event("xp-updated"));
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await refresh(1, "");
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.message || "Failed to load XP history.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFilter = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErr(null);
      await refresh(1, source.trim());
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Filter failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="user-page">
        <Container className="user-container">
          <div className="user-header d-flex align-items-start justify-content-between gap-3">
            <div>
              <h2 className="user-title">XP History</h2>
              <div className="user-sub">Track earned/spent XP transactions.</div>
            </div>

            <Button variant="outline-primary" onClick={() => navigate("/Profile")}> 
              Profile
            </Button>
          </div>

          {err && <Alert variant="danger">{err}</Alert>}

          <Card className="user-card user-panel mb-3">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <div style={{ opacity: 0.8, fontSize: 13 }}>Current Balance</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{loading ? "…" : xp}</div>
              </div>

              <Form onSubmit={onFilter} className="d-flex align-items-center gap-2">
                <Form.Control
                  placeholder="Filter by source (optional)"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
                <Button type="submit" variant="success" disabled={loading}>
                  {loading ? "Loading…" : "Apply"}
                </Button>
              </Form>
            </div>
          </Card>

          <Card className="user-card user-panel">
            {loading ? (
              <div className="d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" /> Loading…
              </div>
            ) : (
              <>
                <Table responsive hover className="mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ opacity: 0.8 }}>No transactions.</td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.id}>
                          <td>{fmtDate(r.created_at)}</td>
                          <td><Badge bg="dark">{r.source}</Badge></td>
                          <td>{amtBadge(r.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <Button
                    variant="outline-light"
                    disabled={page <= 1}
                    onClick={() => refresh(page - 1, source)}
                  >
                    Prev
                  </Button>

                  <div style={{ opacity: 0.85 }}>
                    Page <b>{page}</b> / {lastPage}
                  </div>

                  <Button
                    variant="outline-light"
                    disabled={page >= lastPage}
                    onClick={() => refresh(page + 1, source)}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </Card>
        </Container>
      </div>
    </>
  );
}
