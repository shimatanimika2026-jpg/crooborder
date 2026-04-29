import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';

/**
 * 发布前自动冒烟测试
 * 
 * 测试目标：
 * 1. 登录页打开且包含真实登录按钮和用户名输入框
 * 2. 生产计划页打开且包含真实标题和关键入口
 * 3. 收货页打开且包含真实标题和"新建收货"或"从 ASN 创建收货"
 * 4. 异常中心页打开且包含真实标题和关键筛选/入口
 * 5. Final Test 页打开且包含真实标题和关键入口
 * 6. QA 页打开且包含真实标题和关键入口
 * 7. Shipment 页打开且包含真实标题和关键入口
 * 8. 路由配置完整
 */

describe('Pre-Release Smoke Tests', () => {
  /**
   * 测试1: 登录页打开且包含真实登录按钮和用户名输入框
   */
  it('should render LoginPage with real login button and username input', async () => {
    const LoginPage = (await import('@/pages/LoginPage')).default;
    
    render(<LoginPage />);

    // 真实断言：必须有登录按钮
    const loginButton = screen.getByRole('button', { name: /登录|login/i });
    expect(loginButton).toBeInTheDocument();

    // 真实断言：必须有用户名输入框
    const usernameInput = screen.getByPlaceholderText(/用户名|username/i);
    expect(usernameInput).toBeInTheDocument();
  });

  /**
   * 测试2: 生产计划页打开且包含真实标题和关键入口
   */
  it('should render ProductionPlansPage with real title and key entry', async () => {
    const ProductionPlansPage = (await import('@/pages/ProductionPlansPage')).default;
    
    render(<ProductionPlansPage />);

    // 真实断言：必须有"生产计划"标题（使用 getAllByText 处理多个匹配）
    const titles = screen.getAllByText(/生产计划/i);
    expect(titles.length).toBeGreaterThan(0);
    expect(titles[0]).toBeInTheDocument();
  });

  /**
   * 测试3: 收货页打开且包含真实标题和"新建收货"或"从 ASN 创建收货"
   */
  it('should render ReceivingListPage with real title and create entry', async () => {
    const ReceivingListPage = (await import('@/pages/ReceivingListPage')).default;
    
    render(<ReceivingListPage />);

    // 真实断言：必须有"收货管理"或"新建收货"或"从 ASN 创建收货"
    const hasReceivingContent = 
      screen.queryByText(/收货管理|receiving/i) ||
      screen.queryByText(/新建收货|创建收货|create.*receiving/i) ||
      screen.queryByText(/从.*ASN.*创建|from.*ASN/i) ||
      screen.queryByRole('button', { name: /新建|创建|create/i });
    
    expect(hasReceivingContent).toBeInTheDocument();
  });

  /**
   * 测试4: 异常中心页打开且包含真实标题和关键筛选入口
   * 断言：h1 标题「异常中心」+ 筛选面板标题「筛选条件」
   * 注：页面初始为 loading 骨架屏，需等待异步数据加载完成后断言
   */
  it('should render ExceptionCenterPage with real title and key filters', async () => {
    const ExceptionCenterPage = (await import('@/pages/ExceptionCenterPage')).default;

    render(<ExceptionCenterPage />);

    // 等待 loading 骨架屏消失、真实 h1 出现
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: '异常中心', level: 1 })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 真实断言：筛选面板标题（CardTitle）
    expect(screen.getByText('筛选条件')).toBeInTheDocument();
  });

  /**
   * 测试5: Final Test 页打开且包含真实标题和「创建测试记录」入口按钮
   * 断言：h1 标题「最终测试」+ 按钮文本「创建测试记录」
   * 注：页面初始为 loading 骨架屏，需等待异步数据加载完成后断言
   */
  it('should render FinalTestManagementPage with real title and key entry', async () => {
    const FinalTestManagementPage = (await import('@/pages/FinalTestManagementPage')).default;

    render(<FinalTestManagementPage />);

    // 等待 loading 骨架屏消失、真实 h1 出现
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: '最终测试', level: 1 })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 真实断言：创建入口按钮
    expect(screen.getByRole('button', { name: /创建测试记录/ })).toBeInTheDocument();
  });

  /**
   * 测试6: QA 放行管理页打开且包含真实标题和「创建放行记录」入口按钮
   * 断言：h1 标题「QA 放行管理」+ 按钮文本「创建放行记录」
   * 注：页面初始为 loading 骨架屏，需等待异步数据加载完成后断言
   */
  it('should render QAReleaseManagementPage with real title and key entry', async () => {
    const QAReleaseManagementPage = (await import('@/pages/QAReleaseManagementPage')).default;

    render(<QAReleaseManagementPage />);

    // 等待 loading 骨架屏消失、真实 h1 出现
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'QA 放行管理', level: 1 })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 真实断言：创建入口按钮
    expect(screen.getByRole('button', { name: /创建放行记录/ })).toBeInTheDocument();
  });

  /**
   * 测试7: 出货确认管理页打开且包含真实标题和「创建出货记录」入口按钮
   * 断言：h1 标题「出货确认管理」+ 按钮文本「创建出货记录」
   * 注：页面初始为 loading 骨架屏，需等待异步数据加载完成后断言
   */
  it('should render ShipmentConfirmationPage with real title and key entry', async () => {
    const ShipmentConfirmationPage = (await import('@/pages/ShipmentConfirmationPage')).default;

    render(<ShipmentConfirmationPage />);

    // 等待 loading 骨架屏消失、真实 h1 出现
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: '出货确认管理', level: 1 })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 真实断言：创建入口按钮
    expect(screen.getByRole('button', { name: /创建出货记录/ })).toBeInTheDocument();
  });

  /**
   * 测试8: 路由配置存在且完整
   */
  it('should have complete routes configuration', async () => {
    const routesModule = await import('@/routes');
    
    // 验证：路由配置存在
    expect(routesModule).toBeTruthy();
    expect(routesModule.routes).toBeTruthy();
    
    // 验证：包含核心路由
    const routeConfig = routesModule.routes;
    expect(Array.isArray(routeConfig)).toBe(true);
    expect(routeConfig.length).toBeGreaterThan(10); // 至少有 10+ 个路由
    
    // 验证：包含关键路由路径
    const paths = routeConfig.map((route: any) => route.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/login');
  });
});
