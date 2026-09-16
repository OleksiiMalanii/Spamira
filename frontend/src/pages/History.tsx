import { t, useLocale } from '../lib/i18n';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { historySchema } from '../lib/api';
import { useResource } from '../lib/useResource';
import { Empty, ErrorNotice, Loading, MessageTable } from '../components/Common';

export function History() {
  useLocale();

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
          <div className="eyebrow">{t('EVERY MESSAGE, ACCOUNTED FOR')}</div>
          <h1>{t('Classification history')}</h1>
          <p>{t('Find a past analysis and revisit the signals behind it.')}</p>
        </div>
      </div>
      <section className="card history-card">
        <div className="history-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label={t('Search messages')}
              placeholder={t('Search message content…')}
              value={search}
              maxLength={5000}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filters">
            <select
              aria-label={t('Filter by classification')}
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('All classifications')}</option>
              <option value="spam">{t('Spam')}</option>
              <option value="legitimate">{t('Legitimate')}</option>
            </select>
            <select
              aria-label={t('Sort by date')}
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="desc">{t('Newest first')}</option>
              <option value="asc">{t('Oldest first')}</option>
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
                    ? t('No messages')
                    : t('{first}–{last} of {total} messages', {
                        first: (page - 1) * 10 + 1,
                        last: Math.min(page * 10, data.totalCount),
                        total: data.totalCount,
                      })}
                </span>
                <div>
                  <button
                    className="icon-button"
                    aria-label={t('Previous page')}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span>
                    {t('Page {page} of {total}', { page, total: Math.max(1, data.totalPages) })}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={t('Next page')}
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
      <p className="table-hint">
        {t(
          'Past results keep their original model version. Analyze the text again to use the current model.',
        )}{' '}
      </p>
      <p className="table-hint">{t('Select a message to view its full text and model version.')}</p>
    </>
  );
}
