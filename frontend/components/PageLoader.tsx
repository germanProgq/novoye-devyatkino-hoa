import React from 'react';

interface PageLoaderProps {
  visible: boolean;
}

const PageLoader: React.FC<PageLoaderProps> = ({ visible }) => {
  const clipId = React.useId();

  return (
    <div
      className={`page-loader ${visible ? 'page-loader--visible' : 'page-loader--hidden'}`}
      aria-busy={visible}
      aria-label="Загрузка портала"
      aria-hidden={!visible}
    >
      <div className="page-loader__content" role="status" aria-hidden={!visible}>
        <div className="page-loader__icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" aria-hidden="true" className="page-loader__svg">
            <defs>
              <clipPath id={`${clipId}-house`}>
                <path d="M8 32.5 32 12l24 20.5v21c0 2-1.6 3.5-3.5 3.5h-12c-1.9 0-3.5-1.6-3.5-3.5v-12h-10v12c0 2-1.6 3.5-3.5 3.5h-12C9.6 57 8 55.4 8 53.5z" />
              </clipPath>
            </defs>
            <rect
              className="page-loader__fill"
              clipPath={`url(#${clipId}-house)`}
              x="6"
              y="8"
              width="52"
              height="52"
              rx="6"
            />
            <path
              className="page-loader__outline"
              d="M8 32.5 32 12l24 20.5v21c0 2-1.6 3.5-3.5 3.5h-12c-1.9 0-3.5-1.6-3.5-3.5v-12h-10v12c0 2-1.6 3.5-3.5 3.5h-12C9.6 57 8 55.4 8 53.5z"
            />
            <path className="page-loader__door" d="M28 38h8v12h-8z" />
          </svg>
        </div>
        <p className="page-loader__label">Запускаем портал</p>
        <p className="page-loader__caption">Дом загружается…</p>
      </div>
      <span className="sr-only">Идет загрузка портала ТСЖ</span>
    </div>
  );
};

export default PageLoader;
