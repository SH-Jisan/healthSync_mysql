import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    MagnifyingGlass,
    X,
    User,
    Buildings,
    FirstAid,
    FileText,
    Calendar,
    Package,
    Article,
    Clock,
    MapPin,
    ArrowRight,
    Sparkle,
    Funnel,
    Plus,
    Activity,
    Info,
    CaretLeft,
    CaretRight
} from 'phosphor-react';
import styles from './GlobalSearchModal.module.css';
import BookAppointmentModal from '@/features/doctor/BookAppointmentModal';
import EventDetailsModal from '@/features/timeline/EventDetailsModal';

const highlightText = (text: string, highlight: string) => {
    if (!highlight || !highlight.trim()) return <span>{text}</span>;
    const escaped = highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) => 
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className={styles.highlight}>{part}</mark>
                ) : (
                    part
                )
            )}
        </span>
    );
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: Props) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Core States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    
    // Results & Loading
    const [results, setResults] = useState<any>(null);
    const [categoryStats, setCategoryStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeItemIndex, setActiveItemIndex] = useState(0);
    const [isInputFocused, setIsInputFocused] = useState(false);

    // Advanced category-specific quick filters
    const [quickFilters, setQuickFilters] = useState<any>({
        location: '',
        specialty: '',
        hospitalId: '',
        availability: '',
        eventType: '',
        severity: '',
        date: '',
        status: ''
    });

    // Recent Searches & User Roles
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [userRole, setUserRole] = useState<string>('CITIZEN');

    // Sub-Modals overlay states
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [selectedBlog, setSelectedBlog] = useState<any>(null);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Refs
    const modalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load static user state & recent history on mount
    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('healthsync_recent_searches');
            if (saved) {
                try { setRecentSearches(JSON.parse(saved)); } catch (e) {}
            }
            
            supabase.auth.getUser().then(({ data }) => {
                if (data.user) {
                    setUserRole(data.user.user_metadata?.role || 'CITIZEN');
                }
            });

            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);

            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Reset pagination and quick filters when switching categories
    useEffect(() => {
        setCurrentPage(1);
        setQuickFilters({
            location: '',
            specialty: '',
            hospitalId: '',
            availability: '',
            eventType: '',
            severity: '',
            date: '',
            status: ''
        });
    }, [selectedCategory]);

    // Format list of flat results for keyboard focus traversal
    const flatResults = useMemo(() => {
        const list: any[] = [];
        if (!results) return list;

        const order = ['doctors', 'hospitals', 'diagnostics', 'reports', 'appointments', 'patients', 'services', 'blogs', 'packages', 'specializations'];
        order.forEach(catKey => {
            const items = results[catKey] || [];
            items.forEach((item: any) => {
                if (typeof item === 'string') {
                    list.push({ name: item, _category: catKey });
                } else {
                    list.push({ ...item, _category: catKey });
                }
            });
        });
        return list;
    }, [results]);

    // API search query execution (Triggered on query/category/page/filters adjustments)
    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        setError(null);

        const debouncer = setTimeout(async () => {
            try {
                const apiFilters: any = {
                    category: selectedCategory,
                    page: currentPage,
                    limit: 10,
                    ...quickFilters
                };

                const { data, error, stats } = await (supabase as any).globalSearch(searchQuery, apiFilters);
                if (error) {
                    setError(error.message);
                } else {
                    setResults(data);
                    if (stats) {
                        setCategoryStats(stats);
                    }
                    setActiveItemIndex(0);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(debouncer);
    }, [searchQuery, selectedCategory, currentPage, quickFilters, isOpen, refreshTrigger]);

    // Keyboard bindings for spotlight interactions
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveItemIndex(prev => 
                    flatResults.length > 0 ? (prev + 1) % flatResults.length : 0
                );
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveItemIndex(prev => 
                    flatResults.length > 0 ? (prev - 1 + flatResults.length) % flatResults.length : 0
                );
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (flatResults[activeItemIndex]) {
                    handleSelectResult(flatResults[activeItemIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, flatResults, activeItemIndex]);

    const handleSelectResult = async (item: any) => {
        if (searchQuery.trim()) {
            const updated = [searchQuery.trim(), ...recentSearches.filter(s => s !== searchQuery.trim())].slice(0, 5);
            setRecentSearches(updated);
            localStorage.setItem('healthsync_recent_searches', JSON.stringify(updated));
        }

        const cat = item._category;

        if (cat === 'doctors') {
            setSelectedDoctor(item);
        } else if (cat === 'reports') {
            setLoading(true);
            const { data, error } = await supabase
                .from('medical_events')
                .select('*, uploader(*), profiles(*)')
                .eq('id', item.id)
                .single();
            setLoading(false);
            if (error) {
                alert(error.message);
            } else if (data) {
                setSelectedReport(data);
            }
        } else if (cat === 'hospitals') {
            onClose();
            navigate(`/doctors?hospital=${encodeURIComponent(item.full_name)}`);
        } else if (cat === 'diagnostics') {
            onClose();
            navigate(`/prescriptions`);
        } else if (cat === 'appointments') {
            onClose();
            navigate(`/appointments`);
        } else if (cat === 'patients') {
            onClose();
            navigate(`/dashboard/patient/${item.id}`);
        } else if (cat === 'services') {
            onClose();
            navigate(`/prescriptions`);
        } else if (cat === 'blogs') {
            setSelectedBlog(item);
        } else if (cat === 'packages') {
            setSelectedPackage(item);
        } else if (cat === 'specializations') {
            setQuickFilters((prev: any) => ({ ...prev, specialty: item.name }));
            setSelectedCategory('doctors');
        }
    };

    // Category lists meta
    const categories = [
        { value: 'all', label: t('search.categories.all', 'All'), Icon: Sparkle },
        { value: 'doctors', label: t('search.categories.doctors', 'Doctors'), Icon: User },
        { value: 'hospitals', label: t('search.categories.hospitals', 'Hospitals'), Icon: Buildings },
        { value: 'diagnostics', label: t('search.categories.diagnostics', 'Diagnostics'), Icon: FirstAid },
        { value: 'reports', label: t('search.categories.reports', 'Reports'), Icon: FileText },
        { value: 'appointments', label: t('search.categories.appointments', 'Appointments'), Icon: Calendar },
        { value: 'patients', label: t('search.categories.patients', 'Patients'), Icon: User, roles: ['DOCTOR', 'HOSPITAL', 'DIAGNOSTIC'] },
        { value: 'services', label: t('search.categories.services', 'Services'), Icon: Activity },
        { value: 'specializations', label: t('search.categories.specialization', 'Specialties'), Icon: Sparkle },
        { value: 'blogs', label: t('search.categories.blogs', 'Blogs'), Icon: Article },
        { value: 'packages', label: t('search.categories.packages', 'Packages'), Icon: Package },
    ];

    const visibleCategories = categories.filter(c => !c.roles || c.roles.includes(userRole));

    const handleClearFilters = () => {
        setQuickFilters({
            location: '',
            specialty: '',
            hospitalId: '',
            availability: '',
            eventType: '',
            severity: '',
            date: '',
            status: ''
        });
    };

    // Render Dynamic Quick Filters Row
    const renderQuickFilters = () => {
        if (selectedCategory === 'all') return null;

        const isAnyFilterActive = Object.values(quickFilters).some(v => v !== '');

        return (
            <div className={styles.filterSectionRow}>
                <div className={styles.filtersContainer}>
                    {/* Doctors Category Filters */}
                    {selectedCategory === 'doctors' && (
                        <>
                            <select
                                value={quickFilters.specialty}
                                onChange={e => setQuickFilters((prev: any) => ({ ...prev, specialty: e.target.value }))}
                                className={styles.filterSelect}
                            >
                                <option value="">{t('search.filters.any_specialty', 'Any Specialty')}</option>
                                <option value="Cardiology">Cardiology</option>
                                <option value="Pediatrics">Pediatrics</option>
                                <option value="Neurology">Neurology</option>
                                <option value="Gynecology">Gynecology</option>
                            </select>

                            <select
                                value={quickFilters.hospitalId}
                                onChange={e => setQuickFilters((prev: any) => ({ ...prev, hospitalId: e.target.value }))}
                                className={styles.filterSelect}
                            >
                                <option value="">{t('search.filters.any_hospital', 'Any Hospital')}</option>
                                <option value="h1111111-1111-1111-1111-111111111111">Dhaka Medical Hospital</option>
                                <option value="h2222222-2222-2222-2222-222222222222">Evercare Hospital</option>
                            </select>

                            <select
                                value={quickFilters.availability}
                                onChange={e => setQuickFilters((prev: any) => ({ ...prev, availability: e.target.value }))}
                                className={styles.filterSelect}
                            >
                                <option value="">{t('search.filters.availability', 'Availability')}</option>
                                <option value="available">Available Today</option>
                            </select>
                        </>
                    )}

                    {/* Medical Reports Filters */}
                    {selectedCategory === 'reports' && (
                        <>
                            <select
                                value={quickFilters.eventType}
                                onChange={e => setQuickFilters((prev: any) => ({ ...prev, eventType: e.target.value }))}
                                className={styles.filterSelect}
                            >
                                <option value="">{t('search.filters.any_type', 'Any Type')}</option>
                                <option value="REPORT">Report</option>
                                <option value="PRESCRIPTION">Prescription</option>
                                <option value="VACCINATION">Vaccination</option>
                            </select>

                            <select
                                value={quickFilters.severity}
                                onChange={e => setQuickFilters((prev: any) => ({ ...prev, severity: e.target.value }))}
                                className={styles.filterSelect}
                            >
                                <option value="">{t('search.filters.any_severity', 'Any Severity')}</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                            </select>

                            <input
                                type="date"
                                value={quickFilters.date}
                                onChange={e => setQuickFilters((prev: any) => ({ ...prev, date: e.target.value }))}
                                className={styles.filterDateInput}
                            />
                        </>
                    )}

                    {/* Appointments Filters */}
                    {selectedCategory === 'appointments' && (
                        <>
                            <select
                                value={quickFilters.status}
                                onChange={e => setQuickFilters((prev: any) => ({ ...prev, status: e.target.value }))}
                                className={styles.filterSelect}
                            >
                                <option value="">{t('search.filters.any_status', 'Any Status')}</option>
                                <option value="PENDING">Pending</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>

                            <input
                                type="date"
                                value={quickFilters.date}
                                onChange={e => setQuickFilters((prev: any) => ({ ...prev, date: e.target.value }))}
                                className={styles.filterDateInput}
                            />
                        </>
                    )}

                    {/* Location Filters for Hospitals / Diagnostics */}
                    {(selectedCategory === 'hospitals' || selectedCategory === 'diagnostics') && (
                        <select
                            value={quickFilters.location}
                            onChange={e => setQuickFilters((prev: any) => ({ ...prev, location: e.target.value }))}
                            className={styles.filterSelect}
                        >
                            <option value="">{t('search.filters.any_location', 'Any Location')}</option>
                            <option value="Dhaka">Dhaka</option>
                            <option value="Chittagong">Chittagong</option>
                            <option value="Sylhet">Sylhet</option>
                            <option value="Rajshahi">Rajshahi</option>
                        </select>
                    )}
                </div>

                {isAnyFilterActive && (
                    <button onClick={handleClearFilters} className={styles.clearFiltersBtn}>
                        {t('search.clear_filters', 'Reset Filters')}
                    </button>
                )}
            </div>
        );
    };

    // Render Pagination footer control
    const renderPagination = () => {
        if (selectedCategory === 'all') return null;

        const total = categoryStats ? categoryStats[selectedCategory] : 0;
        if (!total || total <= 10) return null;

        const totalPages = Math.ceil(total / 10);

        return (
            <div className={styles.paginationBar}>
                <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={styles.pageBtn}
                >
                    <CaretLeft size={14} weight="bold" />
                    <span>{t('common.prev', 'Previous')}</span>
                </button>
                <span className={styles.pageInfo}>
                    {t('search.page_indicator', `Page ${currentPage} of ${totalPages}`, { current: currentPage, total: totalPages })}
                </span>
                <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className={styles.pageBtn}
                >
                    <span>{t('common.next', 'Next')}</span>
                    <CaretRight size={14} weight="bold" />
                </button>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()} ref={modalRef}>
                
                {/* Left Category Sidebar */}
                <div className={styles.sidebarPane}>
                    <div className={styles.sidebarHeader}>
                        <h3>HealthSync Hub</h3>
                    </div>
                    <div className={styles.categoryList}>
                        {visibleCategories.map(c => {
                            const Icon = c.Icon;
                            const count = categoryStats ? categoryStats[c.value] : 0;
                            return (
                                <button
                                    key={c.value}
                                    onClick={() => setSelectedCategory(c.value)}
                                    className={`${styles.sidebarItem} ${selectedCategory === c.value ? styles.activeSidebarItem : ''}`}
                                >
                                    <div className={styles.sidebarItemLeft}>
                                        <Icon size={16} />
                                        <span>{c.label}</span>
                                    </div>
                                    {c.value !== 'all' && count !== undefined && (
                                        <span className={styles.statsBadge}>{count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Content Pane */}
                <div className={styles.contentPane}>
                    {/* Search Input Header */}
                    <div className={`${styles.header} ${isInputFocused ? styles.headerFocused : ''}`}>
                        {loading ? (
                            <div className={styles.headerSpinner} />
                        ) : (
                            <MagnifyingGlass size={22} className={styles.searchIcon} />
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={t('search.input_placeholder', 'Search doctors, hospitals, reports, appointments, packages...')}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            className={styles.input}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className={styles.clearBtn}>
                                <X size={16} />
                            </button>
                        )}
                        <span className={styles.escapeBadge}>ESC</span>
                    </div>

                    {/* Category quick filters */}
                    {renderQuickFilters()}

                    {/* Scrollable Results area */}
                    <div className={styles.content}>
                        {/* Loading State Overlay */}
                        {loading && flatResults.length === 0 && (
                            <div className={styles.loadingContainer}>
                                <div className={styles.spinner}></div>
                                <p>{t('search.loading', 'Loading HealthSync records...')}</p>
                            </div>
                        )}

                        {/* Error state */}
                        {error && (
                            <div className={styles.errorContainer}>
                                <p className={styles.errorMessage}>{t('search.error', 'Failed to retrieve records:')} {error}</p>
                            </div>
                        )}

                        {/* Suggestion block (on Empty Input and Category is 'All') */}
                        {!searchQuery.trim() && selectedCategory === 'all' && !loading && (
                            <div className={styles.suggestionsContainer}>
                                {recentSearches.length > 0 && (
                                    <div className={styles.suggestionSection}>
                                        <h3>{t('search.recent_searches', 'Recent Searches')}</h3>
                                        <div className={styles.suggestionList}>
                                            {recentSearches.map((term, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => setSearchQuery(term)}
                                                    className={styles.suggestionItem}
                                                >
                                                    <Clock size={12} />
                                                    <span>{term}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className={styles.suggestionSection}>
                                    <h3>{t('search.popular_searches', 'Popular Medical Searches')}</h3>
                                    <div className={styles.suggestionList}>
                                        {['Cardiology', 'ECG', 'Blood', 'Fasting Sugar', 'X-Ray', 'Dhaka'].map((term, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => setSearchQuery(term)}
                                                className={styles.suggestionItem}
                                            >
                                                <MagnifyingGlass size={12} />
                                                <span>{term}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.instructions}>
                                    <div className={styles.instructionItem}>
                                        <span className={styles.kbd}>↑↓</span>
                                        <span>{t('search.navigate_tip', 'Navigate')}</span>
                                    </div>
                                    <div className={styles.instructionItem}>
                                        <span className={styles.kbd}>Enter</span>
                                        <span>{t('search.select_tip', 'Select')}</span>
                                    </div>
                                    <div className={styles.instructionItem}>
                                        <span className={styles.kbd}>ESC</span>
                                        <span>{t('search.close_tip', 'Close')}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Dynamic search results list */}
                        {(!selectedCategory || selectedCategory !== 'all' || searchQuery.trim()) && !error && (
                            <div className={styles.resultsList}>
                                {flatResults.length === 0 && !loading ? (
                                    <div className={styles.emptyState}>
                                        <Info size={36} className={styles.emptyIcon} />
                                        <h3>{t('search.no_results_title', 'No records found')}</h3>
                                        <p>{t('search.no_results_desc', 'We couldn\'t find any matching records. Try modifying search words or active filters.')}</p>
                                    </div>
                                ) : (
                                    flatResults.map((item, idx) => {
                                        const isSelected = idx === activeItemIndex;
                                        const cat = item._category;
                                        
                                        let catLabel = cat;
                                        let title = '';
                                        let details = '';
                                        let badgeColor = '';
                                        let actionText = '';
                                        let IconComponent = MagnifyingGlass;

                                        if (cat === 'doctors') {
                                            catLabel = t('search.categories.doctors', 'Doctor');
                                            title = `Dr. ${item.full_name}`;
                                            details = `${item.specialty || ''} • ${item.degree || ''} • Fee: ${item.consultation_fee || 'N/A'} BDT`;
                                            badgeColor = styles.badgeDoctor;
                                            actionText = t('search.actions.book', 'Book Appt');
                                            IconComponent = User;
                                        } else if (cat === 'hospitals') {
                                            catLabel = t('search.categories.hospitals', 'Hospital');
                                            title = item.full_name;
                                            details = `${item.address || ''} • ${item.district || ''} • ${item.phone || ''}`;
                                            badgeColor = styles.badgeHospital;
                                            actionText = t('search.actions.view_doctors', 'Doctors');
                                            IconComponent = Buildings;
                                        } else if (cat === 'diagnostics') {
                                            catLabel = t('search.categories.diagnostics', 'Diagnostic');
                                            title = item.full_name;
                                            details = `${item.address || ''} • ${item.phone || ''}`;
                                            badgeColor = styles.badgeDiagnostic;
                                            actionText = t('search.actions.view_services', 'Services');
                                            IconComponent = FirstAid;
                                        } else if (cat === 'reports') {
                                            catLabel = t('search.categories.reports', 'Report');
                                            title = item.title;
                                            details = `${t('search.patient', 'Patient')}: ${item.patient_name} • ${item.event_type} • Date: ${item.event_date}`;
                                            badgeColor = styles.badgeReport;
                                            actionText = t('search.actions.view_report', 'View Report');
                                            IconComponent = FileText;
                                        } else if (cat === 'appointments') {
                                            catLabel = t('search.categories.appointments', 'Appointment');
                                            title = `${t('search.appt_with', 'Appt')}: ${userRole === 'CITIZEN' ? 'Dr. ' + item.doctor_name : item.patient_name}`;
                                            details = `Date: ${item.appointment_date} • Reason: ${item.reason || 'N/A'} • Status: ${item.status}`;
                                            badgeColor = styles.badgeAppointment;
                                            actionText = t('search.actions.manage', 'View Schedule');
                                            IconComponent = Calendar;
                                        } else if (cat === 'patients') {
                                            catLabel = t('search.categories.patients', 'Patient');
                                            title = item.full_name;
                                            details = `Blood: ${item.blood_group || 'N/A'} • Phone: ${item.phone || ''} • Email: ${item.email}`;
                                            badgeColor = styles.badgePatient;
                                            actionText = t('search.actions.view_file', 'Open File');
                                            IconComponent = User;
                                        } else if (cat === 'services') {
                                            catLabel = t('search.categories.services', 'Service');
                                            title = item.name;
                                            details = `Category: ${item.category || ''} • Price: ${item.base_price} BDT`;
                                            badgeColor = styles.badgeService;
                                            actionText = t('search.actions.order', 'Order Test');
                                            IconComponent = Activity;
                                        } else if (cat === 'blogs') {
                                            catLabel = t('search.categories.blogs', 'Blog');
                                            title = item.title;
                                            details = `By ${item.author} • ${item.readTime} read • ${item.summary}`;
                                            badgeColor = styles.badgeBlog;
                                            actionText = t('search.actions.read', 'Read Blog');
                                            IconComponent = Article;
                                        } else if (cat === 'packages') {
                                            catLabel = t('search.categories.packages', 'Package');
                                            title = item.name;
                                            details = `${item.description} • Price: ${item.price} BDT • ${item.testsCount} tests`;
                                            badgeColor = styles.badgePackage;
                                            actionText = t('search.actions.view_pkg', 'Package Details');
                                            IconComponent = Package;
                                        } else if (cat === 'specializations') {
                                            catLabel = t('search.categories.specialization', 'Specialty');
                                            title = item.name;
                                            details = `Search for doctors specializing in ${item.name}`;
                                            badgeColor = styles.badgeSpecialty;
                                            actionText = t('search.actions.filter', 'Find Doctors');
                                            IconComponent = Sparkle;
                                        }

                                        return (
                                            <div
                                                key={idx}
                                                className={`${styles.resultCard} ${isSelected ? styles.selectedCard : ''}`}
                                                onClick={() => handleSelectResult(item)}
                                                onMouseEnter={() => setActiveItemIndex(idx)}
                                            >
                                                <div className={styles.cardLeft}>
                                                    <div className={styles.cardIconBox}>
                                                        <IconComponent size={18} />
                                                    </div>
                                                    <div className={styles.cardInfo}>
                                                         <div className={styles.cardHeaderRow}>
                                                             <span className={styles.cardTitle}>{highlightText(title, searchQuery)}</span>
                                                             <span className={`${styles.categoryBadge} ${badgeColor}`}>{catLabel}</span>
                                                         </div>
                                                         <span className={styles.cardDetails}>{highlightText(details, searchQuery)}</span>
                                                     </div>
                                                </div>

                                                <div className={styles.cardRight}>
                                                    <button className={styles.actionButton}>
                                                        <span>{actionText}</span>
                                                        <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer pagination */}
                    {renderPagination()}
                </div>

            </div>

            {/* Sub-modals inside Search overlay */}
            {/* 1. Doctor Appointment Booking */}
            {selectedDoctor && (
                <div onClick={e => e.stopPropagation()}>
                    <BookAppointmentModal 
                        doctor={selectedDoctor} 
                        onClose={() => setSelectedDoctor(null)} 
                    />
                </div>
            )}

            {/* 2. Medical Report Details */}
            {selectedReport && (
                <div onClick={e => e.stopPropagation()}>
                    <EventDetailsModal 
                        event={selectedReport} 
                        onClose={() => setSelectedReport(null)} 
                        onUpdate={() => setRefreshTrigger(prev => prev + 1)}
                        onDelete={() => setRefreshTrigger(prev => prev + 1)}
                    />
                </div>
            )}

            {/* 3. Blog Article Reader */}
            {selectedBlog && (
                <div className={styles.subModalOverlay} onClick={() => setSelectedBlog(null)}>
                    <div className={styles.subModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.subModalHeader}>
                            <div>
                                <span className={styles.subModalCategory}>Health Blog</span>
                                <h2>{selectedBlog.title}</h2>
                                <p className={styles.subModalAuthor}>By {selectedBlog.author} • {selectedBlog.readTime} read</p>
                            </div>
                            <button className={styles.subModalCloseBtn} onClick={() => setSelectedBlog(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.subModalBody}>
                            <p className={styles.blogLead}>{selectedBlog.summary}</p>
                            <p>Proper healthcare and awareness are vital components of a balanced life. In this article, we explore how understanding your specific biomarkers and maintaining a consistent health schedule can significantly decrease long-term medical risks. By keeping active records of blood pressure, blood glucose, and lipid profiles on HealthSync, patients can share unified summaries directly with their doctors for customized consultations.</p>
                            <h3>Key Recommendations</h3>
                            <ul>
                                <li>Establish baseline tests regularly (at least once a year).</li>
                                <li>Perform moderate cardio exercise for 30 minutes, five days a week.</li>
                                <li>Maintain a diet low in sodium and saturated fats.</li>
                                <li>Always follow up with your doctor after retrieving lab diagnostic reports.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Health Package Details */}
            {selectedPackage && (
                <div className={styles.subModalOverlay} onClick={() => setSelectedPackage(null)}>
                    <div className={styles.subModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.subModalHeader}>
                            <div>
                                <span className={styles.subModalCategory}>Health Package</span>
                                <h2>{selectedPackage.name}</h2>
                                <p className={styles.subModalPrice}>Price: {selectedPackage.price} BDT</p>
                            </div>
                            <button className={styles.subModalCloseBtn} onClick={() => setSelectedPackage(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.subModalBody}>
                            <p className={styles.blogLead}>{selectedPackage.description}</p>
                            <h3>What is included in this package?</h3>
                            <div className={styles.packageGrid}>
                                <div className={styles.packageTestItem}>
                                    <strong>Tests Included:</strong> {selectedPackage.testsCount} professional clinical screens
                                </div>
                                <div className={styles.packageTestItem}>
                                    <strong>Category:</strong> {selectedPackage.category} Wellness
                                </div>
                            </div>
                            <p style={{ marginTop: '1rem' }}>This health package has been tailored specifically to provide comprehensive coverage of primary markers. Booking this package schedules your diagnostic collections and links them directly to your personal HealthSync timeline once completed.</p>
                            <button 
                                className={styles.purchaseBtn} 
                                onClick={() => {
                                    alert(`Successfully booked ${selectedPackage.name}! Go to billing or diagnostics section to view invoices.`);
                                    setSelectedPackage(null);
                                }}
                            >
                                <span>Book Package Now</span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
