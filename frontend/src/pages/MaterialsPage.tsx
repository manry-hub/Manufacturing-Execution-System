import React from 'react';
import { useShopfloor } from '../context/ShopfloorContext.js';
import { MaterialsView } from '../components/materials/MaterialsView.js';

export const MaterialsPage: React.FC = () => {
  const { runs } = useShopfloor();
  return <MaterialsView runs={runs} />;
};

export default MaterialsPage;
