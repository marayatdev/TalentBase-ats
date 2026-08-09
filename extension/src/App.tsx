import { useEffect, useState } from "react";

interface ActivePage {
  url: string;
  title: string;
}

export default function App() {
  const [activePage, setActivePage] =
    useState<ActivePage | null>(null);

  useEffect(() => {
    async function loadActiveTab() {
      const [tab] =
        await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

      setActivePage({
        url: tab.url ?? "",
        title: tab.title ?? "",
      });
    }

    void loadActiveTab();
  }, []);

  return (
    <main
      style={{
        width: 360,
        minHeight: 240,
        padding: 16,
        background: "#FAF6EC",
        color: "#20261F",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 18,
          color: "#1F4A3A",
        }}
      >
        HR ATS Candidate Finder
      </h1>

      <p
        style={{
          marginTop: 6,
          fontSize: 13,
          opacity: 0.65,
        }}
      >
        Find job seeker posts from Facebook groups.
      </p>

      <section
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 10,
          background: "#EFE6D3",
        }}
      >
        <strong
          style={{
            display: "block",
            fontSize: 13,
          }}
        >
          Current page
        </strong>

        <p
          style={{
            margin: "6px 0 0",
            fontSize: 12,
            wordBreak: "break-word",
          }}
        >
          {activePage?.title || "No active page"}
        </p>

        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            opacity: 0.6,
            wordBreak: "break-all",
          }}
        >
          {activePage?.url}
        </p>
      </section>
    </main>
  );
}