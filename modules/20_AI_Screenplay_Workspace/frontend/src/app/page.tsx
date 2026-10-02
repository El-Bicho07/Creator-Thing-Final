"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

interface Project {
  id: string;
  name: string;
  type: string;
  lastEdited: string;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:8000/projects")
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(err => console.error("Backend not running", err));
  }, []);

  return (
    <div className={styles.container} style={{ backgroundColor: "#0a0a0b", padding: "4rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", width: "100%" }}>
        <header style={{ marginBottom: "3rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 700, margin: 0 }}>Your Universe</h1>
          <button style={{
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            color: "white",
            padding: "0.75rem 1.5rem",
            borderRadius: "8px",
            border: "none",
            fontWeight: 600,
            cursor: "pointer"
          }}>+ Create New Series</button>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {projects.map(proj => (
            <div 
              key={proj.id}
              onClick={() => router.push(`/project/${proj.id}`)}
              style={{
                backgroundColor: "rgba(20, 20, 22, 0.7)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "1.5rem",
                cursor: "pointer",
                transition: "transform 0.2s, background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(30, 30, 33, 0.8)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(20, 20, 22, 0.7)"}
            >
              <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.2rem" }}>{proj.name}</h2>
              <div style={{ color: "#a0a0a5", fontSize: "0.9rem", marginBottom: "1.5rem" }}>{proj.type}</div>
              <div style={{ color: "#666", fontSize: "0.8rem", display: "flex", justifyContent: "space-between" }}>
                <span>Last edited {proj.lastEdited}</span>
                <span style={{ color: "#6366f1" }}>Open →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
