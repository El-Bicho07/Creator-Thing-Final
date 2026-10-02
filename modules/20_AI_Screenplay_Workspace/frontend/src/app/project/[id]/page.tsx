"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import styles from "../../page.module.css";

export default function WritersRoom() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [activeTab, setActiveTab] = useState("draft");
  const [messages, setMessages] = useState<{role: 'user' | 'agent', content: string}[]>([
    { role: 'agent', content: `Orchestrator online for project ${projectId}. Context retriever and Continuity Critic are standing by.` }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [script, setScript] = useState("");
  
  // RAG Upload State
  const [uploadStatus, setUploadStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const userMsg = inputValue;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, project_id: projectId })
      });

      const data = await response.json();
      
      let agentReply = data.response;
      if (data.critic_intervened) {
        agentReply = `[Critic Intervened: Continuity Fixed]\n\n` + agentReply;
      }
      if (data.context_retrieved) {
        agentReply = `[RAG Context Retrieved]\n\n` + agentReply;
      }

      setMessages(prev => [...prev, { role: 'agent', content: agentReply }]);
      setScript(prev => prev + "\n\n" + data.response);
      
    } catch (error) {
      setMessages(prev => [...prev, { role: 'agent', content: 'Error connecting to backend.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    
    setUploadStatus("Uploading & Embedding into ChromaDB...");
    
    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
        setUploadStatus(`Successfully embedded ${data.chunks_added} chunks of canon!`);
      } else {
        setUploadStatus("Error: " + data.message);
      }
    } catch (err) {
      setUploadStatus("Upload failed.");
    }
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>Writer's Room</div>
        <button className={styles.button} onClick={() => window.location.href = '/'}>← Back to Dashboard</button>
        
        <div className={styles.navSection}>
          <div className={styles.navTitle}>Workspace</div>
          <div className={`${styles.navItem} ${activeTab === 'draft' ? styles.navItemActive : ''}`} onClick={() => setActiveTab('draft')}>
            Draft Editor
          </div>
          <div className={`${styles.navItem} ${activeTab === 'canon' ? styles.navItemActive : ''}`} onClick={() => setActiveTab('canon')}>
            Story Canon (Memory Engine)
          </div>
          <div className={`${styles.navItem} ${activeTab === 'characters' ? styles.navItemActive : ''}`} onClick={() => setActiveTab('characters')}>
            Characters Database
          </div>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>Project: {projectId}</div>
          <div className={styles.statusBadge}>Multi-Agent System Active</div>
        </header>
        
        <div className={styles.workspace}>
          {/* Main Panel based on active tab */}
          <div className={styles.editorArea}>
            {activeTab === 'draft' && (
              <div className={styles.document}>
                <h1 className={styles.title}>Scene Draft</h1>
                <textarea 
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  style={{
                    width: "100%", height: "60vh", backgroundColor: "transparent", 
                    border: "none", color: "var(--text-primary)", fontSize: "1.1rem", 
                    fontFamily: "inherit", resize: "none", outline: "none",
                    lineHeight: "1.6"
                  }}
                  placeholder="Your script will appear here. Talk to the Orchestrator on the right to start writing!"
                />
              </div>
            )}

            {activeTab === 'canon' && (
              <div className={styles.document}>
                <h1 className={styles.title}>Story Canon & RAG</h1>
                <p className={styles.metaInfo}>Upload previous scripts or story bibles. The Context Engine will memorize them.</p>
                
                <div style={{
                  border: "2px dashed var(--border-color)", padding: "3rem", 
                  borderRadius: "12px", textAlign: "center", marginBottom: "2rem",
                  backgroundColor: "rgba(255,255,255,0.02)"
                }}>
                  <p style={{marginBottom: "1rem"}}>Upload .txt or .pdf files to expand the universe memory.</p>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{display: "none"}} accept=".txt,.pdf" />
                  <button className={styles.button} style={{width: "auto", margin: "0 auto"}} onClick={() => fileInputRef.current?.click()}>
                    Select File to Embed
                  </button>
                  {uploadStatus && <p style={{marginTop: "1rem", color: "var(--text-accent)"}}>{uploadStatus}</p>}
                </div>
              </div>
            )}

            {activeTab === 'characters' && (
              <div className={styles.document}>
                <h1 className={styles.title}>Character Intelligence</h1>
                <p>The Character agent ensures nobody speaks out of character.</p>
                {/* Character list placeholder */}
                <div style={{marginTop: "2rem"}}>
                  <div style={{padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "8px", marginBottom: "1rem"}}>
                    <strong>Arjun</strong> - Introverted, anxious, overthinks.
                  </div>
                  <div style={{padding: "1rem", border: "1px solid var(--border-color)", borderRadius: "8px"}}>
                    <strong>Maya</strong> - Direct, cold, currently avoiding Arjun.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Chat Panel */}
          <div className={styles.chatPanel}>
            <div className={styles.chatHeader}>Co-Writer Orchestrator</div>
            <div className={styles.chatMessages}>
              {messages.map((msg, i) => (
                <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : styles.messageAgent}`}>
                  <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0}}>{msg.content}</pre>
                </div>
              ))}
              {isTyping && <div className={`${styles.message} ${styles.messageAgent}`}>Orchestrator reasoning...</div>}
            </div>
            <div className={styles.chatInputArea}>
              <div className={styles.chatInputWrapper}>
                <input 
                  type="text" className={styles.chatInput} placeholder="Instruct the orchestrator..."
                  value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button className={styles.sendButton} onClick={handleSend} disabled={isTyping || !inputValue.trim()}>
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
