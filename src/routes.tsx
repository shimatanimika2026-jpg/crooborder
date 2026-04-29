import type { ReactNode } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DashboardPageSimple from './pages/DashboardPageSimple';
import ProductionPlansPage from './pages/ProductionPlansPage';
import ProductionPlanCreatePage from './pages/ProductionPlanCreatePage';
import ProductionPlanEditPage from './pages/ProductionPlanEditPage';
import ProductionPlanDetailPage from './pages/ProductionPlanDetailPage';
import ProductionOrdersPage from './pages/ProductionOrdersPage';
import QualityInspectionsPage from './pages/QualityInspectionsPage';
import InventoryPage from './pages/InventoryPage';
import LogisticsPage from './pages/LogisticsPage';
import LogisticsDetailPage from './pages/LogisticsDetailPage';
import AndonBoardPage from './pages/AndonBoardPage';
import WorkStationDetailPage from './pages/WorkStationDetailPage';
import AgingTestListPage from './pages/AgingTestListPage';
import AgingTestDetailPage from './pages/AgingTestDetailPage';
import AssemblyCompletePage from './pages/AssemblyCompletePage';
import FinalTestManagementPage from './pages/FinalTestManagementPage';
import QAReleaseManagementPage from './pages/QAReleaseManagementPage';
import ShipmentConfirmationPage from './pages/ShipmentConfirmationPage';
import TraceabilityPage from './pages/TraceabilityPage';
import FirmwareVersionsPage from './pages/FirmwareVersionsPage';
import FirmwareVersionDetailPage from './pages/FirmwareVersionDetailPage';
import SystemPage from './pages/SystemPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ASNListPage from './pages/ASNListPage';
import ASNDetailPage from './pages/ASNDetailPage';
import ASNCreatePage from './pages/ASNCreatePage';
import ReceivingListPage from './pages/ReceivingListPage';
import ReceivingDetailPage from './pages/ReceivingDetailPage';
import ReceivingCreatePage from './pages/ReceivingCreatePage';
import IQCInspectionPage from './pages/IQCInspectionPage';
import MaterialDispositionPage from './pages/MaterialDispositionPage';
import ExceptionCenterPage from './pages/ExceptionCenterPage';
import ExceptionDetailPage from './pages/ExceptionDetailPage';
import ShippingOrdersPage from './pages/ShippingOrdersPage';
import ShippingOrderDetailPage from './pages/ShippingOrderDetailPage';
import LogisticsDashboardPage from './pages/LogisticsDashboardPage';
import OperationsDashboardPage from './pages/OperationsDashboardPage';
import SpecialApprovalListPage from './pages/SpecialApprovalListPage';
import SpecialApprovalCreatePage from './pages/SpecialApprovalCreatePage';
import SpecialApprovalDetailPage from './pages/SpecialApprovalDetailPage';
import SupplierListPage from './pages/SupplierListPage';
import SupplierCreatePage from './pages/SupplierCreatePage';
import ChinaCollaborationViewPage from './pages/ChinaCollaborationViewPage';
import ExecutiveDashboardPage from './pages/ExecutiveDashboardPage';
import CommissionListPage from './pages/CommissionListPage';
import CommissionCreatePage from './pages/CommissionCreatePage';
import CommissionDetailPage from './pages/CommissionDetailPage';
import FirmwareVersionCreatePage from './pages/FirmwareVersionCreatePage';
import ConfigErrorPage from './pages/ConfigErrorPage';
import UATVerifyPage from './pages/UATVerifyPage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Login',
    path: '/login',
    element: <LoginPage />,
    public: true,
  },
  {
    name: 'Terms',
    path: '/terms',
    element: <TermsPage />,
    public: true,
  },
  {
    name: 'Privacy',
    path: '/privacy',
    element: <PrivacyPage />,
    public: true,
  },
  {
    name: 'Dashboard',
    path: '/',
    element: <DashboardPageSimple />,
  },
  {
    name: 'China Collaboration View',
    path: '/collaboration/china',
    element: <ChinaCollaborationViewPage />,
  },
  {
    name: 'Executive Dashboard',
    path: '/executive/dashboard',
    element: <ExecutiveDashboardPage />,
  },
  {
    name: 'Production Plans',
    path: '/production-plans',
    element: <ProductionPlansPage />,
  },
  {
    name: 'Production Plan Create',
    path: '/production-plans/create',
    element: <ProductionPlanCreatePage />,
  },
  {
    name: 'Production Plan Edit',
    path: '/production-plans/:id/edit',
    element: <ProductionPlanEditPage />,
  },
  {
    name: 'Production Plan Detail',
    path: '/production-plans/:id',
    element: <ProductionPlanDetailPage />,
  },
  {
    name: 'Production Orders',
    path: '/production-orders',
    element: <ProductionOrdersPage />,
  },
  {
    name: 'Quality Inspections',
    path: '/quality-inspections',
    element: <QualityInspectionsPage />,
  },
  {
    name: 'Inventory',
    path: '/inventory',
    element: <InventoryPage />,
  },
  {
    name: 'Logistics',
    path: '/logistics',
    element: <LogisticsPage />,
  },
  {
    name: 'Logistics Detail',
    path: '/logistics/:id',
    element: <LogisticsDetailPage />,
  },
  {
    name: 'Andon Board',
    path: '/assembly/andon',
    element: <AndonBoardPage />,
  },
  {
    name: 'Work Station Detail',
    path: '/assembly/stations/:id',
    element: <WorkStationDetailPage />,
  },
  {
    name: 'Assembly Complete',
    path: '/assembly/complete',
    element: <AssemblyCompletePage />,
  },
  {
    name: 'Aging Tests',
    path: '/aging/tests',
    element: <AgingTestListPage />,
  },
  {
    name: 'Aging Test Detail',
    path: '/aging/tests/:id',
    element: <AgingTestDetailPage />,
  },
  {
    name: 'Final Test Management',
    path: '/final-test',
    element: <FinalTestManagementPage />,
  },
  {
    name: 'QA Release Management',
    path: '/qa-release',
    element: <QAReleaseManagementPage />,
  },
  {
    name: 'Shipment Confirmation',
    path: '/shipment',
    element: <ShipmentConfirmationPage />,
  },
  {
    name: 'Traceability',
    path: '/traceability',
    element: <TraceabilityPage />,
  },
  {
    name: 'Firmware Versions',
    path: '/ota/versions',
    element: <FirmwareVersionsPage />,
  },
  {
    name: 'Firmware Version Create',
    path: '/ota/versions/create',
    element: <FirmwareVersionCreatePage />,
    visible: false,
  },
  {
    name: 'Firmware Version Detail',
    path: '/ota/versions/:id',
    element: <FirmwareVersionDetailPage />,
    visible: false,
  },
  {
    name: 'System',
    path: '/system',
    element: <SystemPage />,
  },
  {
    name: 'ASN List',
    path: '/asn',
    element: <ASNListPage />,
  },
  {
    name: 'ASN Create',
    path: '/asn/create',
    element: <ASNCreatePage />,
  },
  {
    name: 'ASN Detail',
    path: '/asn/:id',
    element: <ASNDetailPage />,
  },
  {
    name: 'Receiving List',
    path: '/receiving',
    element: <ReceivingListPage />,
  },
  {
    name: 'Receiving Create',
    path: '/receiving/create',
    element: <ReceivingCreatePage />,
  },
  {
    name: 'Receiving Detail',
    path: '/receiving/:id',
    element: <ReceivingDetailPage />,
  },
  {
    name: 'IQC Inspection',
    path: '/iqc',
    element: <IQCInspectionPage />,
  },
  {
    name: 'Material Disposition',
    path: '/disposition',
    element: <MaterialDispositionPage />,
  },
  {
    name: 'Exception Center',
    path: '/exceptions',
    element: <ExceptionCenterPage />,
  },
  {
    name: 'Exception Detail',
    path: '/exceptions/:id',
    element: <ExceptionDetailPage />,
    visible: false,
  },
  {
    name: 'Shipping Orders',
    path: '/shipping-orders',
    element: <ShippingOrdersPage />,
  },
  {
    name: 'Shipping Order Detail',
    path: '/shipping-orders/:id',
    element: <ShippingOrderDetailPage />,
    visible: false,
  },
  {
    name: 'Logistics Dashboard',
    path: '/logistics-dashboard',
    element: <LogisticsDashboardPage />,
  },
  {
    name: 'Operations Dashboard',
    path: '/operations-dashboard',
    element: <OperationsDashboardPage />,
  },
  {
    name: 'Special Approval List',
    path: '/special-approval',
    element: <SpecialApprovalListPage />,
  },
  {
    name: 'Special Approval Create',
    path: '/special-approval/new',
    element: <SpecialApprovalCreatePage />,
    visible: false,
  },
  {
    name: 'Special Approval Detail',
    path: '/special-approval/:id',
    element: <SpecialApprovalDetailPage />,
    visible: false,
  },
  {
    name: 'Supplier List',
    path: '/suppliers',
    element: <SupplierListPage />,
  },
  {
    name: 'Supplier Create',
    path: '/suppliers/new',
    element: <SupplierCreatePage />,
  },
  {
    name: 'Commission List',
    path: '/commission',
    element: <CommissionListPage />,
  },
  {
    name: 'Commission Create',
    path: '/commission/create',
    element: <CommissionCreatePage />,
    visible: false,
  },
  {
    name: 'Commission Detail',
    path: '/commission/:id',
    element: <CommissionDetailPage />,
    visible: false,
  },
  {
    name: 'Config Error',
    path: '/config-error',
    element: <ConfigErrorPage />,
    visible: false,
    public: true,
  },
  {
    name: 'UAT Verify',
    path: '/uat-verify',
    element: <UATVerifyPage />,
    visible: false,
    public: true,
  },
];
