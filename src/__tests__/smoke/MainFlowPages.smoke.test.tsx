import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import AssemblyCompletePage from '@/pages/AssemblyCompletePage';
import AgingTestListPage from '@/pages/AgingTestListPage';
import FinalTestManagementPage from '@/pages/FinalTestManagementPage';
import QAReleaseManagementPage from '@/pages/QAReleaseManagementPage';
import ShipmentConfirmationPage from '@/pages/ShipmentConfirmationPage';

describe('Main Flow Pages Smoke Test', () => {
  it('should render Assembly Complete page', async () => {
    render(<AssemblyCompletePage />);
    
    // 验证页面能打开且关键入口存在
    await waitFor(() => {
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('should render Aging Test page', async () => {
    render(<AgingTestListPage />);
    
    // 验证页面能打开且关键入口存在
    await waitFor(() => {
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('should render Final Test page', async () => {
    render(<FinalTestManagementPage />);
    
    // 验证页面能打开且关键入口存在
    await waitFor(() => {
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('should render QA Release page', async () => {
    render(<QAReleaseManagementPage />);
    
    // 验证页面能打开且关键入口存在
    await waitFor(() => {
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('should render Shipment Confirmation page', async () => {
    render(<ShipmentConfirmationPage />);
    
    // 验证页面能打开且关键入口存在
    await waitFor(() => {
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
