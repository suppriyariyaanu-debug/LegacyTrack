import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useActiveCase } from '../../context/CaseContext';
import { searchCase } from '../../services/api';
import Icon from '../ui/Icon';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 200;

/**
 * Header search across the active case: the deceased person, bank accounts,
 * insurance policies, claims and documents.
 *
 * Opens on focus, closes on Escape or an outside click, and supports
 * Arrow Up / Arrow Down / Enter. On small screens it collapses to an icon that
 * opens the same search as a full-width bar.
 */
export default function GlobalSearch() {
  const { activeId } = useActiveCase();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle', groups: [] });
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const trimmed = query.trim();
  const flat = useMemo(() => state.groups.flatMap((group) => group.items), [state.groups]);

  // Debounced search of the local mock data (no network involved).
  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setState({ status: 'idle', groups: [] });
      setActiveIndex(-1);
      return undefined;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'searching' }));
    const timer = setTimeout(() => {
      searchCase(activeId, trimmed)
        .then((groups) => {
          if (cancelled) return;
          setState({ status: 'done', groups });
          setActiveIndex(-1);
        })
        .catch(() => !cancelled && setState({ status: 'error', groups: [] }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, activeId]);

  // Start fresh after navigating or switching case.
  useEffect(() => {
    setOpen(false);
    setQuery('');
  }, [pathname, activeId]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    inputRef.current?.blur();
  };

  const go = (item) => {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    navigate(item.href);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (!open || flat.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(flat[activeIndex >= 0 ? activeIndex : 0]);
    }
  };

  const openFromToggle = () => {
    setOpen(true);
    // Wait for the bar to be shown before focusing it.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const showResults = state.status === 'done' && flat.length > 0;
  const optionId = (index) => `global-search-option-${index}`;
  let runningIndex = -1;

  return (
    <div className={`gsearch${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="icon-btn gsearch__toggle"
        aria-label="Search this case"
        onClick={openFromToggle}
      >
        <Icon name="search" />
      </button>

      <div className="gsearch__panel">
        <div className="gsearch__bar">
          <label className="header__search">
            <Icon name="search" size={16} />
            <span className="sr-only">Search this case</span>
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded={open}
              aria-controls="global-search-results"
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
              autoComplete="off"
              placeholder="Search assets, claims, documents…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
            />
          </label>
          <button
            type="button"
            className="icon-btn gsearch__close"
            aria-label="Close search"
            onClick={close}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {open && (
          <div className="gsearch__popover" id="global-search-results">
            {trimmed.length < MIN_QUERY_LENGTH && (
              <div className="gsearch__message">
                <Icon name="search" size={20} />
                <p className="gsearch__message-title">Search this case</p>
                <p>
                  Find the deceased person, bank accounts, insurance policies, claims and
                  documents. Type at least {MIN_QUERY_LENGTH} characters.
                </p>
              </div>
            )}

            {trimmed.length >= MIN_QUERY_LENGTH && state.status === 'searching' && !showResults && (
              <p className="gsearch__status" role="status">
                Searching…
              </p>
            )}

            {state.status === 'error' && (
              <p className="gsearch__status" role="alert">
                Search is unavailable right now. Please try again.
              </p>
            )}

            {state.status === 'done' && flat.length === 0 && (
              <div className="gsearch__message" role="status">
                <Icon name="search" size={20} />
                <p className="gsearch__message-title">No results for &ldquo;{trimmed}&rdquo;</p>
                <p>Check the spelling, or try a name, reference number or the last 4 digits.</p>
              </div>
            )}

            {showResults && (
              <ul className="gsearch__results" role="listbox" aria-label="Search results">
                {state.groups.map((group) => (
                  <li key={group.id} role="presentation">
                    <p className="gsearch__group" role="presentation">
                      <Icon name={group.icon} size={14} /> {group.label}
                      {group.total > group.items.length && (
                        <span>
                          {' '}
                          · showing {group.items.length} of {group.total}
                        </span>
                      )}
                    </p>
                    <ul role="presentation">
                      {group.items.map((item) => {
                        runningIndex += 1;
                        const index = runningIndex;
                        return (
                          <li
                            key={item.id}
                            id={optionId(index)}
                            role="option"
                            aria-selected={index === activeIndex}
                            className={`gsearch__option${index === activeIndex ? ' is-active' : ''}`}
                            onMouseEnter={() => setActiveIndex(index)}
                            // mousedown keeps focus in the input until the click lands
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => go(item)}
                          >
                            <span className="gsearch__title">{item.title}</span>
                            <span className="gsearch__subtitle">{item.subtitle}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}

            <p className="gsearch__hint" aria-hidden="true">
              <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
