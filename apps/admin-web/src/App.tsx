import "./App.css";
import i18n from "./i18n";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";

type CoachVerificationRequest = {
  id: string;
  coachName: string;
  specialties: string;
  yearsExperience: number;
  responseTime: string;
  status: "under_review" | "verified" | "rejected";
  submittedAt: string;
  rejectionReason?: string;
};

const initialRequests: CoachVerificationRequest[] = [
  {
    id: "vr1",
    coachName: "Maya Thompson",
    specialties: "Strength, fat loss",
    yearsExperience: 6,
    responseTime: "2h",
    status: "under_review",
    submittedAt: "2026-03-05T10:00:00.000Z",
  },
  {
    id: "vr2",
    coachName: "Samir Rahal",
    specialties: "Hypertrophy, posture",
    yearsExperience: 8,
    responseTime: "4h",
    status: "under_review",
    submittedAt: "2026-03-06T08:30:00.000Z",
  },
  {
    id: "vr3",
    coachName: "Elena Moreau",
    specialties: "Nutrition coaching",
    yearsExperience: 4,
    responseTime: "5h",
    status: "verified",
    submittedAt: "2026-03-01T09:15:00.000Z",
  },
];

function App() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<CoachVerificationRequest[]>(initialRequests);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "under_review"),
    [requests]
  );

  const recentDecisions = useMemo(
    () => requests.filter((request) => request.status !== "under_review"),
    [requests]
  );

  const updateStatus = (id: string, status: "verified" | "rejected") => {
    setRequests((prev) =>
      prev.map((request) => {
        if (request.id !== id) {
          return request;
        }

        if (status === "rejected") {
          return {
            ...request,
            status,
            rejectionReason: "Document mismatch in submitted certification.",
          };
        }

        return {
          ...request,
          status,
          rejectionReason: undefined,
        };
      })
    );
  };

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>

        <div className="languageSwitcher">
          <span>{t("language")}</span>
          <button onClick={() => void i18n.changeLanguage("en")}>EN</button>
          <button onClick={() => void i18n.changeLanguage("fr")}>FR</button>
          <button onClick={() => void i18n.changeLanguage("ar")}>AR</button>
        </div>
      </header>

      <section className="layoutGrid">
        <article className="card">
          <h2>{t("queueTitle")}</h2>
          <p>{t("queueHint")}</p>

          <div className="listSection">
            <h3>{t("pendingTab")}</h3>
            {pendingRequests.length === 0 ? <p>{t("emptyQueue")}</p> : null}

            {pendingRequests.map((request) => (
              <div className="requestCard" key={request.id}>
                <div className="requestHeader">
                  <strong>{request.coachName}</strong>
                  <span className="badge warning">{t("underReview")}</span>
                </div>
                <p>
                  {t("specialties")}: {request.specialties}
                </p>
                <p>
                  {t("yearsExp")}: {request.yearsExperience}
                </p>
                <p>
                  {t("responseTime")}: {request.responseTime}
                </p>
                <p>
                  {t("notes")}: ID and certification docs uploaded, awaiting final verification.
                </p>

                <div className="actionsRow">
                  <button className="action approve" onClick={() => updateStatus(request.id, "verified")}>
                    {t("approve")}
                  </button>
                  <button className="action reject" onClick={() => updateStatus(request.id, "rejected")}>
                    {t("reject")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>{t("recentDecisions")}</h2>
          <div className="listSection">
            {recentDecisions.map((request) => (
              <div className="requestCard" key={request.id}>
                <div className="requestHeader">
                  <strong>{request.coachName}</strong>
                  {request.status === "verified" ? (
                    <span className="badge success">{t("verified")}</span>
                  ) : (
                    <span className="badge danger">{t("rejected")}</span>
                  )}
                </div>
                <p>
                  {t("specialties")}: {request.specialties}
                </p>
                <p>
                  Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                </p>
                {request.status === "rejected" ? (
                  <p>
                    {t("rejectedReason")}: {request.rejectionReason}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;
