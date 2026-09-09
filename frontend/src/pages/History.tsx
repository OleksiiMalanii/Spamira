import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { historySchema } from '../lib/api';
import { useResource } from '../lib/useResource';
import { Empty, ErrorNotice, Loading, MessageTable } from '../components/Common';

export function History() {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [label, setLabel] = useState('');
  const [sort, setSort] = useState('desc');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const params = new URLSearchParams({ page: String(page), pageSize: '10', sort });
  if (term) params.set('search', term);
  if (label) params.set('label', label);
  const { data, loading, error, refresh } = useResource(
    `/classifications?${params}`,
    historySchema,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EVERY MESSAGE, ACCOUNTED FOR</div>
          <h1>Classification history</h1>
          <p>Find a past analysis and revisit the signals behind it.</p>
        </div>
      </div>
      <section className="card history-card">
        <div className="history-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search messages"
              placeholder="Search message content…"
              value={search}
              maxLength={5000}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filters">
            <select
              aria-label="Filter by classification"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All classifications</option>
              <option value="spam">Spam</option>
              <option value="legitimate">Legitimate</option>
            </select>
            <select
              aria-label="Sort by date"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorNotice message={error} retry={refresh} />
        ) : (
          data && (
            <>
              {data.items.length ? (
                <MessageTable items={data.items} />
              ) : (
                <Empty filtered={Boolean(term || label)} />
              )}
              <div className="pagination">
                <span>
                  {data.totalCount === 0
                    ? 'No messages'
                    : `${(page - 1) * 10 + 1}–${Math.min(page * 10, data.totalCount)} of ${data.totalCount.toLocaleString()} messages`}
                </span>
                <div>
                  <button
                    className="icon-button"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span>
                    Page {page} of {Math.max(1, data.totalPages)}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Next page"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )
        )}
      </section>
      <p className="table-hint">Select a message to view its full text and model version.</p>
    </>
  );
}
