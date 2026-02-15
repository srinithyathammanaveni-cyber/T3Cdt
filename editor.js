import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

// Quill toolbar options for rich text formatting
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ script: 'sub' }, { script: 'super' }],
  ['blockquote', 'code-block'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  ['link', 'image', 'video'],
  ['clean']
];

// Auto-save interval in milliseconds
const SAVE_INTERVAL_MS = 2000;

const Editor = ({ documentId, username, socket }) => {
  const [quill, setQuill] = useState(null);
  const [title, setTitle] = useState('Untitled Document');
  const [isSaving, setIsSaving] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  // Initialize Quill editor
  useEffect(() => {
    if (!wrapperRef.current) return;

    // Clear and create new editor container
    wrapperRef.current.innerHTML = '';
    const editorContainer = document.createElement('div');
    wrapperRef.current.appendChild(editorContainer);

    // Initialize Quill with options
    const quillInstance = new Quill(editorContainer, {
      theme: 'snow',
      modules: {
        toolbar: TOOLBAR_OPTIONS
      },
      placeholder: 'Start collaborating in real-time...',
    });

    // Disable editor until document loads
    quillInstance.disable();
    setQuill(quillInstance);

    // Cleanup on unmount
    return () => {
      if (quillInstance) {
        quillInstance.off('text-change');
      }
    };
  }, []);

  // Load document from server
  useEffect(() => {
    if (!socket || !quill || !documentId) return;

    console.log('📄 Loading document:', documentId);
    socket.emit('get-document', documentId);

    // Listen for document load
    socket.once('load-document', (document) => {
      console.log('✅ Document loaded:', document);
      
      // Set document content
      quill.setContents(document.data);
      quill.enable();
      setTitle(document.title || 'Untitled Document');
      
      // Focus on editor
      quill.focus();
    });

    return () => {
      socket.off('load-document');
    };
  }, [socket, quill, documentId]);

  // Send changes to server
  useEffect(() => {
    if (!socket || !quill || !documentId) return;

    const handleTextChange = (delta, oldDelta, source) => {
      if (source !== 'user') return;
      socket.emit('send-changes', delta, documentId);
    };

    quill.on('text-change', handleTextChange);

    return () => {
      quill.off('text-change', handleTextChange);
    };
  }, [socket, quill, documentId]);

  // Receive changes from server
  useEffect(() => {
    if (!socket || !quill) return;

    const handleReceiveChanges = (delta) => {
      quill.updateContents(delta);
    };

    socket.on('receive-changes', handleReceiveChanges);

    return () => {
      socket.off('receive-changes', handleReceiveChanges);
    };
  }, [socket, quill]);

  // Auto-save document periodically
  useEffect(() => {
    if (!socket || !quill || !documentId) return;

    const saveInterval = setInterval(() => {
      if (quill && socket) {
        setIsSaving(true);
        const delta = quill.getContents();
        socket.emit('save-document', delta, documentId);
        
        // Show saved indicator
        setTimeout(() => {
          setIsSaving(false);
          setLastSaved(new Date().toLocaleTimeString());
        }, 500);
      }
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(saveInterval);
    };
  }, [socket, quill, documentId]);

  // Handle user joined
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (data) => {
      console.log('👤 User joined:', data.userId);
      // Add to collaborators list
      setCollaborators(prev => [...prev, { id: data.userId, timestamp: data.timestamp }]);
    };

    const handleUserLeft = (data) => {
      console.log('👋 User left:', data.userId);
      // Remove from collaborators list
      setCollaborators(prev => prev.filter(c => c.id !== data.userId));
    };

    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket]);

  // Handle document saved notification
  useEffect(() => {
    if (!socket) return;

    const handleDocumentSaved = (data) => {
      console.log('💾 Document saved by:', data.savedBy);
    };

    socket.on('document-saved', handleDocumentSaved);

    return () => {
      socket.off('document-saved', handleDocumentSaved);
    };
  }, [socket]);

  // Handle title updates from other users
  useEffect(() => {
    if (!socket) return;

    const handleTitleUpdated = (data) => {
      setTitle(data.title);
    };

    socket.on('title-updated', handleTitleUpdated);

    return () => {
      socket.off('title-updated', handleTitleUpdated);
    };
  }, [socket]);

  // Handle connection status
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      console.log('🔌 Socket connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('🔌 Socket disconnected');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  // Handle title change
  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Debounce title update
    if (socket && documentId) {
      clearTimeout(window.titleTimeout);
      window.titleTimeout = setTimeout(() => {
        socket.emit('update-title', newTitle, documentId);
      }, 1000);
    }
  };

  // Handle save now
  const handleSaveNow = () => {
    if (quill && socket && documentId) {
      setIsSaving(true);
      const delta = quill.getContents();
      socket.emit('save-document', delta, documentId);
      
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date().toLocaleTimeString());
      }, 500);
    }
  };

  // Handle back button
  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="editor-container">
      {/* Editor Header */}
      <div className="editor-header">
        <div className="editor-header-left">
          <button className="back-button" onClick={handleBack}>
            <i className="fas fa-arrow-left"></i>
            <span>Back</span>
          </button>
          
          <input
            type="text"
            className="document-title-input"
            value={title}
            onChange={handleTitleChange}
            placeholder="Document Title"
            maxLength="100"
          />
        </div>
        
        <div className="editor-header-right">
          {/* Collaborators Badge */}
          <div className="collaborators-badge">
            <i className="fas fa-users"></i>
            <span>{collaborators.length + 1} active</span>
          </div>
          
          {/* Save Status */}
          <div className={`save-indicator ${isSaving ? 'saving' : ''}`}>
            {isSaving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <i className="fas fa-check-circle"></i>
                <span>All changes saved</span>
              </>
            )}
          </div>
          
          {/* Connection Status */}
          <div className="save-indicator" style={{ marginLeft: '10px' }}>
            {isConnected ? (
              <>
                <i className="fas fa-wifi" style={{ color: '#4CAF50' }}></i>
                <span>Connected</span>
              </>
            ) : (
              <>
                <i className="fas fa-wifi" style={{ color: '#f44336' }}></i>
                <span>Disconnected</span>
              </>
            )}
          </div>
          
          {/* Manual Save Button */}
          <button 
            className="btn btn-secondary btn-icon" 
            onClick={handleSaveNow}
            title="Save now"
          >
            <i className="fas fa-save"></i>
          </button>
          
          {/* User Badge */}
          <div className="user-badge">
            <i className="fas fa-user-circle"></i>
            <span>{username || 'You'}</span>
          </div>
        </div>
      </div>
      
      {/* Last Saved Indicator */}
      {lastSaved && (
        <div style={{ 
          padding: '5px 25px', 
          background: '#f8f9fa', 
          borderBottom: '1px solid #e0e0e0',
          fontSize: '0.85rem',
          color: '#666',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <i className="fas fa-clock" style={{ marginRight: '5px' }}></i>
          Last saved: {lastSaved}
        </div>
      )}
      
      {/* Quill Editor Container */}
      <div 
        ref={wrapperRef} 
        style={{ 
          flex: 1, 
          overflowY: 'auto',
          position: 'relative',
          background: '#fff'
        }}
      />
      
      {/* Active Collaborators List */}
      {collaborators.length > 0 && (
        <div style={{ 
          padding: '10px 25px', 
          background: '#f8f9fa', 
          borderTop: '1px solid #e0e0e0',
          fontSize: '0.9rem',
          color: '#666',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <i className="fas fa-users" style={{ color: '#667eea' }}></i>
          <span style={{ fontWeight: '600' }}>Currently editing:</span>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ 
              background: '#667eea', 
              color: 'white', 
              padding: '4px 12px', 
              borderRadius: '20px',
              fontSize: '0.85rem'
            }}>
              {username} (you)
            </span>
            {collaborators.map((collaborator, index) => (
              <span key={index} style={{ 
                background: '#e0e0e0', 
                color: '#333', 
                padding: '4px 12px', 
                borderRadius: '20px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span className="status-dot connected" style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: '#4CAF50',
                  borderRadius: '50%',
                  display: 'inline-block'
                }}></span>
                Collaborator {index + 1}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Offline Indicator */}
      {!isConnected && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '30px',
          background: '#ff9800',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease'
        }}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>You are offline. Reconnecting...</span>
        </div>
      )}
    </div>
  );
};

export default Editor;