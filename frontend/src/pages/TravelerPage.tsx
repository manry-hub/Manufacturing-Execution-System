import React from 'react';
import { useShopfloor } from '../context/ShopfloorContext.js';
import { TravelerView } from '../components/traveler/TravelerView.js';

export const TravelerPage: React.FC = () => {
  const { runs } = useShopfloor();
  return <TravelerView runs={runs} />;
};

export default TravelerPage;
