import React from 'react';
import { useShopfloor } from '../context/ShopfloorContext.js';
import { AndonBoardView } from '../components/andon/AndonBoardView.js';

export const AndonBoardPage: React.FC = () => {
  const {
    tickets,
    machines,
    handleAcknowledgeAndon,
    handleResolveAndon,
    handleSubmitAndon,
  } = useShopfloor();

  return (
    <AndonBoardView
      tickets={tickets}
      machines={machines}
      onAcknowledgeTicket={handleAcknowledgeAndon}
      onResolveTicket={handleResolveAndon}
      onCreateTicket={handleSubmitAndon}
    />
  );
};

export default AndonBoardPage;
