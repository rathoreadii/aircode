import React, { useState, useEffect, useRef } from 'react';
import vscode from './vscode';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [profile, setProfile] = useState('8gb');
  const [profiles, setProfiles] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    vscode.postMessage({ command: 'init' });

    const handleMessage = (event) => {
      const message = event.data;

      if (message.command === 'syncProfiles') {
        setProfiles(message.profiles);
        setProfile(message.selected);
      } else if (message.command === 'streamChunk') {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.sender === 'assistant') {
            last.text += message.chunk;
            return [...updated];
          }
          return [...prev, { sender: 'assistant', text: message.chunk }];
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleProfileChange = (newProfile) => {
    setProfile(newProfile);
    vscode.postMessage({ command: 'setProfile', profile: newProfile });
  };

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text: input }]);
    vscode.postMessage({
      command: 'sendMessage',
      prompt: input
    });

    setInput('');
  };

  return (
    <div className="chat-container">
      <div className="profile-card">
        <label style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.8 }}>
          Hardware Profile
        </label>
        <select
          className="select-box"
          value={profile}
          onChange={(e) => handleProfileChange(e.target.value)}
        >
          {Object.entries(profiles).map(([key, item]) => (
            <option key={key} value={key}>
              {item.name}
            </option>
          ))}
        </select>
        {profiles[profile] && (
          <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.7 }}>
            {profiles[profile].description}
          </div>
        )}
      </div>

      <div className="message-stream">
        {messages.length === 0 && (
          <div style={{ opacity: 0.6, textAlign: 'center', marginTop: '40px' }}>
            AirCode is active. Ask questions or type in your editor for inline completions.
          </div>
        )}
        {messages.map((m, index) => (
          <div key={index} className={`bubble ${m.sender}`}>
            {m.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-bar">
        <textarea
          placeholder="Ask AirCode (Enter to send)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button className="send-btn" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}