import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    Robot, PaperPlane, Plus, Trash, FileText, Warning,
    Sparkle, ChatCircleText, Heartbeat, ShieldCheck, PushPin,
    Copy, ArrowClockwise, DownloadSimple, MagnifyingGlass, ArrowDown, Check
} from 'phosphor-react';
import styles from './AIDoctor.module.css';

interface ChatSession {
    id: string;
    title: string;
    is_pinned?: boolean | number;
    created_at: string;
    updated_at: string;
}

interface ChatMessage {
    id: string;
    sender: 'USER' | 'ASSISTANT';
    message: string;
    referenced_event_id?: string;
    created_at: string;
}

interface MedicalEventOption {
    id: string;
    title: string;
    event_type: string;
    event_date: string;
}

export default function AIDoctor() {
    const { i18n } = useTranslation();
    const isBangla = i18n.language === 'bn';

    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(true);

    // Context Attachment: Patient's medical records for discussion
    const [patientReports, setPatientReports] = useState<MedicalEventOption[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string>('');

    // UI Interactive States
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isFar = scrollHeight - scrollTop - clientHeight > 150;
        setShowScrollBottom(isFar);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    // Fetch user reports for reference context
    const fetchPatientReports = useCallback(async () => {
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return;

            const { data, error } = await supabase
                .from('medical_events')
                .select('id, title, event_type, event_date')
                .eq('patient_id', userData.user.id)
                .order('event_date', { ascending: false });

            if (!error && data) {
                setPatientReports(data as MedicalEventOption[]);
            }
        } catch (err) {
            console.error('Failed to load reports for context:', err);
        }
    }, []);

    // Fetch Sessions with Search Filter
    const fetchSessions = useCallback(async (query?: string) => {
        setLoadingSessions(true);
        try {
            const endpoint = query && query.trim()
                ? `ai-assistant/sessions?q=${encodeURIComponent(query.trim())}`
                : 'ai-assistant/sessions';

            const { data, error } = await supabase.functions.invoke(endpoint, {
                method: 'GET'
            });
            if (!error && data && data.success && Array.isArray(data.data)) {
                setSessions(data.data);
                if (data.data.length > 0 && !currentSessionId) {
                    setCurrentSessionId(data.data[0].id);
                }
            } else {
                setSessions([]);
            }
        } catch (err) {
            console.error('Failed to fetch chat sessions:', err);
            setSessions([]);
        } finally {
            setLoadingSessions(false);
        }
    }, [currentSessionId]);

    // Fetch Messages for current session
    const fetchMessages = useCallback(async (sessionId: string) => {
        try {
            const { data, error } = await supabase.functions.invoke(`ai-assistant/messages/${sessionId}`, {
                method: 'GET'
            });
            if (!error && data && data.success && Array.isArray(data.data)) {
                setMessages(data.data);
            } else {
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to fetch messages:', err);
            setMessages([]);
        }
    }, []);

    useEffect(() => {
        fetchPatientReports();
        fetchSessions();
    }, [fetchPatientReports, fetchSessions]);

    useEffect(() => {
        if (currentSessionId) {
            fetchMessages(currentSessionId);
        } else {
            setMessages([]);
        }
    }, [currentSessionId, fetchMessages]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSearchQuery(q);
        fetchSessions(q);
    };

    const handleCreateSession = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('ai-assistant/sessions', {
                body: { title: isBangla ? 'নতুন স্বাস্থ্য বিষয়' : 'New Health Consultation' }
            });
            if (!error && data && data.success) {
                setSessions(prev => [data.data, ...prev]);
                setCurrentSessionId(data.data.id);
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to create new chat session:', err);
        }
    };

    const handleTogglePin = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            const { data, error } = await supabase.functions.invoke(`ai-assistant/sessions/${id}/pin`, {
                method: 'PUT'
            });
            if (!error && data && data.success) {
                setSessions(prev => prev.map(s => s.id === id ? { ...s, is_pinned: data.is_pinned } : s)
                    .sort((a, b) => (Number(b.is_pinned) || 0) - (Number(a.is_pinned) || 0))
                );
            }
        } catch (err) {
            console.error('Failed to toggle pin:', err);
        }
    };

    const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm(isBangla ? 'আপনি কি এই চ্যাট সেশনটি মুছে ফেলতে চান?' : 'Delete this conversation session?')) return;

        try {
            await supabase.functions.invoke(`ai-assistant/sessions/${id}`, {
                method: 'DELETE'
            });
            setSessions(prev => prev.filter(s => s.id !== id));
            if (currentSessionId === id) {
                const remaining = sessions.filter(s => s.id !== id);
                setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
            }
        } catch (err) {
            console.error('Failed to delete session:', err);
        }
    };

    const handleExportChat = async () => {
        if (!currentSessionId) return;
        try {
            const { data, error } = await supabase.functions.invoke(`ai-assistant/export/${currentSessionId}`, {
                method: 'GET'
            });
            if (!error && data && data.success) {
                const blob = new Blob([data.content], { type: 'text/markdown;charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `HealthSync_Consultation_${data.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Failed to export conversation:', err);
            alert('Failed to export chat.');
        }
    };

    const handleDoctorPrep = async () => {
        if (loading) return;
        setLoading(true);

        const tempUserMsg: ChatMessage = {
            id: 'temp-' + Date.now(),
            sender: 'USER',
            message: isBangla ? '🩺 ডাক্তার দেখানোর পূর্বপ্রস্তুতি নির্দেশিকা ও প্রশ্নাবলী জেনারেট করুন' : '🩺 Generate Doctor Visit Consultation Prep & Questions',
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            const { data, error } = await supabase.functions.invoke('ai-assistant/doctor-prep', {
                body: { lang: i18n.language }
            });

            if (error) throw error;

            if (data && data.success) {
                const aiMsg: ChatMessage = {
                    id: 'prep-' + Date.now(),
                    sender: 'ASSISTANT',
                    message: data.data.prepGuide,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), tempUserMsg, aiMsg]);
            }
        } catch (err: any) {
            console.error('Doctor prep error:', err);
            alert('Failed to generate doctor prep guide.');
            setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (textToSend?: string) => {
        const messageText = textToSend || inputMessage;
        if (!messageText.trim() || loading) return;

        setInputMessage('');
        setLoading(true);

        const tempUserMsg: ChatMessage = {
            id: 'temp-' + Date.now(),
            sender: 'USER',
            message: messageText.trim(),
            referenced_event_id: selectedReportId || undefined,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            const { data, error } = await supabase.functions.invoke('ai-assistant/chat', {
                body: {
                    sessionId: currentSessionId,
                    message: messageText.trim(),
                    referencedEventId: selectedReportId || null
                }
            });

            if (error) throw error;

            if (data && data.success) {
                if (!currentSessionId) {
                    setCurrentSessionId(data.data.sessionId);
                    fetchSessions();
                }
                setMessages(prev => [
                    ...prev.filter(m => m.id !== tempUserMsg.id),
                    data.data.userMessage,
                    data.data.aiMessage
                ]);
            }
        } catch (err: any) {
            console.error('Chat error:', err);
            alert(isBangla ? 'উত্তর জেনারেট করা সম্ভব হয়নি: ' + err.message : 'Failed to generate response: ' + err.message);
            setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
        } finally {
            setLoading(false);
            setSelectedReportId('');
        }
    };

    const handleCopyText = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMessageId(id);
        setTimeout(() => setCopiedMessageId(null), 2000);
    };

    const handleRegenerate = () => {
        const lastUserMsg = [...messages].reverse().find(m => m.sender === 'USER');
        if (lastUserMsg) {
            handleSendMessage(lastUserMsg.message);
        }
    };

    const suggestionChips = isBangla ? [
        "আমার সাম্প্রতিক ল্যাব রিপোর্টের সহজ ব্যাখ্যা দিন",
        "আমার নিয়মিত ঔষধগুলোর সেবনবিধি ও সতর্কতা কি?",
        "আমার বর্তমান স্বাস্থ্য অবস্থার জন্য কি কি লাইফস্টাইল পরিবর্তন করা উচিত?",
        "আমার বিগত হাসপাতাল ভর্তির সারসংক্ষেপ কি?"
    ] : [
        "Explain my latest medical report in simple terms",
        "What safety precautions should I follow for my medications?",
        "What personalized lifestyle and dietary changes do you recommend?",
        "Summarize my overall chronic health timeline"
    ];

    return (
        <div className={styles.container}>
            {/* Disclaimer Banner */}
            <div className={styles.disclaimerBanner}>
                <ShieldCheck size={20} className={styles.shieldIcon} />
                <span>
                    {isBangla
                        ? 'HealthSync AI সহকারী স্বাস্থ্য তথ্য ও মেডিকেল রিপোর্ট বিশ্লেষণে সাহায্য করে। এটি নিবন্ধিত ডাক্তারের স্থান দখল করে না।'
                        : 'HealthSync AI Assistant provides context-aware medical information and guidance. It does not replace a licensed medical doctor.'}
                </span>
            </div>

            <div className={styles.chatWrapper}>
                {/* Enterprise Sessions Sidebar */}
                <div className={styles.sidebar}>
                    <button onClick={handleCreateSession} className={styles.newChatBtn}>
                        <Plus size={18} weight="bold" />
                        {isBangla ? 'নতুন পরামর্শ' : 'New Consultation'}
                    </button>

                    {/* Conversation Search Bar */}
                    <div className={styles.searchBox}>
                        <MagnifyingGlass size={16} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder={isBangla ? 'সেশন খুঁজুন...' : 'Search chats...'}
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.sessionList}>
                        {loadingSessions ? (
                            <div className={styles.sidebarLoading}>{isBangla ? 'লোড হচ্ছে...' : 'Loading sessions...'}</div>
                        ) : !Array.isArray(sessions) || sessions.length === 0 ? (
                            <div className={styles.emptySessions}>{isBangla ? 'কোন আগের সেশন নেই' : 'No prior history'}</div>
                        ) : (
                            sessions.map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => setCurrentSessionId(session.id)}
                                    className={`${styles.sessionItem} ${currentSessionId === session.id ? styles.sessionActive : ''}`}
                                >
                                    <ChatCircleText size={18} className={styles.chatIcon} />
                                    <span className={styles.sessionTitle}>{session.title}</span>
                                    <div className={styles.sessionActions}>
                                        <button
                                            onClick={e => handleTogglePin(e, session.id)}
                                            className={`${styles.pinSessionBtn} ${session.is_pinned ? styles.pinnedActive : ''}`}
                                            title="Pin Conversation"
                                        >
                                            <PushPin size={14} weight={session.is_pinned ? 'fill' : 'regular'} />
                                        </button>
                                        <button
                                            onClick={e => handleDeleteSession(e, session.id)}
                                            className={styles.deleteSessionBtn}
                                            title="Delete Chat"
                                        >
                                            <Trash size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Chat Feed Area */}
                <div className={styles.mainChat}>
                    {/* Header bar with actions */}
                    <div className={styles.chatHeader}>
                        <div className={styles.headerTitleArea}>
                            <Robot size={26} className={styles.botIcon} />
                            <div>
                                <h3 className={styles.botName}>{isBangla ? 'হেলথসিঙ্ক AI সহকারী' : 'HealthSync AI Assistant'}</h3>
                                <p className={styles.botStatus}>{isBangla ? 'অনলাইন • আপনার মেডিকেল রেকর্ডের সাথে সংযুক্ত' : 'Online • Synced with your health record'}</p>
                            </div>
                        </div>

                        <div className={styles.headerRightActions}>
                            {/* Reference Context Report Dropdown */}
                            {patientReports.length > 0 && (
                                <div className={styles.attachWrapper}>
                                    <FileText size={16} className={styles.attachIcon} />
                                    <select
                                        value={selectedReportId}
                                        onChange={e => setSelectedReportId(e.target.value)}
                                        className={styles.reportSelect}
                                    >
                                        <option value="">{isBangla ? '--- নির্দিষ্ট রিপোর্ট সিলেক্ট করুন ---' : '--- Reference Specific Report ---'}</option>
                                        {patientReports.map(rep => (
                                            <option key={rep.id} value={rep.id}>
                                                {rep.title} ({rep.event_date ? new Date(rep.event_date).toLocaleDateString() : 'N/A'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Export Chat Button */}
                            {currentSessionId && (
                                <button onClick={handleExportChat} className={styles.exportBtn} title="Export Markdown Transcript">
                                    <DownloadSimple size={18} />
                                    <span>Export</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className={styles.messagesContainer} ref={chatContainerRef} onScroll={handleScroll}>
                        {!Array.isArray(messages) || messages.length === 0 ? (
                            <div className={styles.emptyWelcome}>
                                <Sparkle size={48} className={styles.welcomeSparkle} />
                                <h2>{isBangla ? 'আপনাকে কিভাবে সাহায্য করতে পারি?' : 'How can I assist your health journey today?'}</h2>
                                <p>
                                    {isBangla
                                        ? 'আমি আপনার মেডিকেল রেকর্ড, ল্যাব রিপোর্ট এবং প্রেসক্রিপশনের ভিত্তিতে ব্যক্তিগত স্বাস্থ্য তথ্য প্রদান করতে পারি।'
                                        : 'I can explain your laboratory test reports, check medication guidance, and discuss personalized health steps based on your medical profile.'}
                                </p>

                                <div className={styles.chipsGrid}>
                                    {suggestionChips.map((chip, idx) => (
                                        <button key={idx} onClick={() => handleSendMessage(chip)} className={styles.suggestionChip}>
                                            <Heartbeat size={16} color="var(--primary)" />
                                            <span>{chip}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, index) => (
                                <div
                                    key={msg.id}
                                    className={`${styles.messageBubbleRow} ${msg.sender === 'USER' ? styles.userRow : styles.assistantRow}`}
                                >
                                    <div className={styles.avatarMini}>
                                        {msg.sender === 'USER' ? '👤' : <Robot size={20} color="white" />}
                                    </div>
                                    <div className={`${styles.bubble} ${msg.sender === 'USER' ? styles.userBubble : styles.assistantBubble}`}>
                                        {msg.referenced_event_id && (
                                            <div className={styles.refBadge}>
                                                <FileText size={14} /> Referenced Medical Document Attached
                                            </div>
                                        )}
                                        <div className={styles.markdownWrapper}>
                                            <ReactMarkdown>{msg.message}</ReactMarkdown>
                                        </div>

                                        {/* Message Tools for Assistant */}
                                        {msg.sender === 'ASSISTANT' && (
                                            <div className={styles.msgToolsRow}>
                                                <button
                                                    onClick={() => handleCopyText(msg.id, msg.message)}
                                                    className={styles.toolBtn}
                                                    title="Copy response"
                                                >
                                                    {copiedMessageId === msg.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                                                </button>
                                                {index === messages.length - 1 && (
                                                    <button
                                                        onClick={handleRegenerate}
                                                        className={styles.toolBtn}
                                                        title="Regenerate response"
                                                    >
                                                        <ArrowClockwise size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {loading && (
                            <div className={`${styles.messageBubbleRow} ${styles.assistantRow}`}>
                                <div className={styles.avatarMini}>
                                    <Robot size={20} color="white" />
                                </div>
                                <div className={`${styles.bubble} ${styles.assistantBubble} ${styles.typingBubble}`}>
                                    <span className={styles.dot}></span>
                                    <span className={styles.dot}></span>
                                    <span className={styles.dot}></span>
                                    <span style={{ fontSize: '13px', marginLeft: '8px', color: 'var(--text-secondary)' }}>
                                        {isBangla ? 'মেডিকেল রেকর্ড এনালাইসিস করা হচ্ছে...' : 'Analyzing medical context...'}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Scroll to Bottom Button */}
                    {showScrollBottom && (
                        <button onClick={scrollToBottom} className={styles.scrollTopBtn} title="Scroll to latest">
                            <ArrowDown size={18} />
                        </button>
                    )}

                    {/* Chat Input Bar */}
                    <div className={styles.inputArea}>
                        {/* Quick Actions Bar (Phase 2 Roadmap Feature) */}
                        <div className={styles.quickActionsBar}>
                            <button onClick={handleDoctorPrep} disabled={loading} className={styles.actionChipBtn}>
                                🩺 {isBangla ? 'ডাক্তার অ্যাপয়েন্টমেন্ট প্রস্তুতি' : 'Doctor Visit Prep'}
                            </button>
                            <button onClick={() => handleSendMessage(isBangla ? 'আমার সাম্প্রতিক ল্যাব রিপোর্টগুলোর পরিবর্তন ও ট্রেন্ড এনালাইসিস করুন' : 'Analyze my lab report trends over time')} disabled={loading} className={styles.actionChipBtn}>
                                📊 {isBangla ? 'ল্যাব ট্রেন্ড এনালাইসিস' : 'Lab Trends'}
                            </button>
                            <button onClick={() => handleSendMessage(isBangla ? 'আমার নিয়মিত সেবনকৃত ওষুধগুলোর তথ্য ও নিরাপত্তা যাচাই করুন' : 'Check safety of my active medications')} disabled={loading} className={styles.actionChipBtn}>
                                💊 {isBangla ? 'ওষুধ সতর্কতা' : 'Meds Check'}
                            </button>
                        </div>

                        {selectedReportId && (
                            <div className={styles.activeRefNotice}>
                                <span>Attached Context: <strong>{patientReports.find(r => r.id === selectedReportId)?.title}</strong></span>
                                <button onClick={() => setSelectedReportId('')} className={styles.removeRefBtn}>×</button>
                            </div>
                        )}
                        <div className={styles.inputBoxRow}>
                            <textarea
                                rows={2}
                                value={inputMessage}
                                onChange={e => setInputMessage(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder={isBangla ? 'আপনার স্বাস্থ্য বিষয়ক প্রশ্ন লিখুন (যেমন: আমার সিবিসি রিপোর্ট বুঝিয়ে বলুন)...' : 'Ask about your symptoms, lab reports, or health history...'}
                                className={styles.chatTextarea}
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={loading || !inputMessage.trim()}
                                className={styles.sendBtn}
                            >
                                <PaperPlane size={20} weight="fill" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}