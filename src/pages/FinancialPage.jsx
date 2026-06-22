import { useEffect, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency, formatMetricValue } from '../utils/formatters';

export function FinancialPage() {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    dashboardService.getFinancialSummary().then(setCards);
  }, []);

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Revenue"
        title="Financial"
        description="Monitor recurring revenue, collection efficiency, and invoice exposure in one place."
      />

      <div className="stats-grid">
        {cards.map((card) => {
          const isMoney = ['MRR', 'ARR'].includes(card.label);

          return (
            <article key={card.label} className="stat-card">
              <p className="stat-label">{card.label}</p>
              <h3>{isMoney ? formatCurrency(card.value) : formatMetricValue(card.value, card.suffix ?? '')}</h3>
            </article>
          );
        })}
      </div>
    </section>
  );
}
