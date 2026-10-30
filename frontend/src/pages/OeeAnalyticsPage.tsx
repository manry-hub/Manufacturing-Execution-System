import React from 'react';
import { useShopfloor } from '../context/ShopfloorContext.js';
import { OeeAnalyticsView } from '../components/oee/OeeAnalyticsView.js';

export const OeeAnalyticsPage: React.FC = () => {
  const { machines } = useShopfloor();
  return <OeeAnalyticsView machines={machines} />;
};

export default OeeAnalyticsPage;
