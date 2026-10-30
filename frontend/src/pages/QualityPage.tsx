import React from 'react';
import { useShopfloor } from '../context/ShopfloorContext.js';
import { QualityView } from '../components/quality/QualityView.js';

export const QualityPage: React.FC = () => {
  const { runs, refreshData } = useShopfloor();
  return <QualityView runs={runs} onRefreshRuns={refreshData} />;
};

export default QualityPage;
