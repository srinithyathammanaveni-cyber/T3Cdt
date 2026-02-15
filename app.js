import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  useNavigate,
  useParams 
} from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import './App.css';
import Editor from './components/Editor';

// Login Component
const LoginScreen = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = () => {
    if (username.trim().length < 3) {
      alert('Username must be at least 3 characters');
      return;
    }
    setIsLoading(true);
    onJoin(username.trim());
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>
          <i className="fas fa-file-alt"></i> 
          CollabEditor
        </h1>
        <p className="subtitle">Real-time Collaborative Document Editor</p>
        <p className="task-badge" style={{
          background: 'linear-gradient(90deg, #667eea, #764ba2)',
          color: 'white',
          padding: '8px 20px',
          borderRadius: '50px',
          display: 'inline-block',
          marginBottom: '30px',
          fontSize: '0.9rem',
          fontWeight: '600'
        }}>
          Internship Task 3: Collaborative Editor
        </p>

        <div className="form-group">
          <label>
            <i className="fas fa-user"></i>
            Your Name
          </label>
          <input
            type="text"
            placeholder="Enter your display name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            maxLength="20"
            autoFocus
          />
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleJoin}
          disabled={isLoading}
        >
          {isLoading ? (
            <><i className="fas fa-spinner fa-spin"></i> Joining...</>
          ) : (
            <><i className="fas fa-sign-in-alt"></i> Join Workspace</>
          )}
        </button>

        <div className="features">
          <h3><i className="fas fa-star"></i> Features</h3>
          <ul>
            <li><i className="fas fa-check"></i> Real-time collaboration</li>
            <li><i className="fas fa-check"></i> Rich text formatting</li>
            <li><i className="fas fa-check"></i> Auto-save to MongoDB</li>
            <li><i className="fas fa-check"></i> Multiple documents</li>
            <li><i className="fas fa-check"></i> Live cursor tracking</li>
            <li><i className="fas fa-check"></i> Responsive design</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ username, documents, onCreateNew, onLogout }) => {
  const navigate = useNavigate();

  const openDocument = (id) => {
    navigate(`/docs/${id}`);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>
          <i className="fas fa-file-alt"></i> 
          CollabEditor
        </h1>
        <div className="user-info">
          <div className="user-badge">
            <i className="fas fa-user-circle"></i>
            <span>{username}</span>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onLogout}>
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>

      <div className="documents-list">
        <div className="documents-header">
          <h2>
            <i className="fas fa-folder-open"></i> 
            Your Documents
          </h2>
          <button className="btn btn-primary" onClick={onCreateNew}>
            <i className="fas fa-plus"></i> New Document
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-file-alt"></i>
            <h3>No documents yet</h3>
            <p>Create your first document to start collaborating!</p>
          </div>
        ) : (
          <div className="documents-grid">
            {documents.map((doc) => (
              <div 
                key={doc._id} 
                className="document-card"
                onClick={() => openDocument(doc._id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <i className="fas fa-file-alt" style={{ fontSize: '24px' }}></i>
                </div>
                <div className="document-title">{doc.title}</div>
                <div className="document-meta">
                  <span>
                    <i className="fas fa-clock"></i> 
                    Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                  </span>
                  <span>
                    <i className="fas fa-user"></i> 
                    {doc.createdBy || 'Anonymous'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Document Router Component
const DocumentRouter = ({ username, socket }) => {
  const { id } = useParams();
  return <Editor documentId={id} username={username} socket={socket} />;
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [socket, setSocket] = useState(null);

  // Load documents from API
  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      const data = await response.json();
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  // Initialize Socket.IO connection
  const initSocket = () => {
    const io = require('socket.io-client');
    const socketConnection = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:9000');
    setSocket(socketConnection);
    return socketConnection;
  };

  // Handle user join
  const handleJoin = (username) => {
    setUser(username);
    initSocket();
    loadDocuments();
  };

  // Handle logout
  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    setUser(null);
    setSocket(null);
  };

  // Create new document
  const handleCreateNew = () => {
    const newId = uuidv4();
    window.location.href = `/docs/${newId}`;
  };

  // Load documents on mount
  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginScreen onJoin={handleJoin} />
              )
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              user ? (
                <Dashboard 
                  username={user} 
                  documents={documents} 
                  onCreateNew={handleCreateNew}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          <Route 
            path="/docs/:id" 
            element={
              user && socket ? (
                <DocumentRouter username={user} socket={socket} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;