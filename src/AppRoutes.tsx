import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { RouteGuard } from '@/components/common/RouteGuard';
import AppLayout from '@/components/layouts/AppLayout';
import { routes } from './routes';

function AppContent() {
  const location = useLocation();

  // 从 routes.tsx 读取公开路由
  const publicPaths = routes.filter((r) => r.public).map((r) => r.path);
  const isPublicPage = publicPaths.includes(location.pathname);

  return (
    <>
      <IntersectObserver />
      {isPublicPage ? (
        <Routes>
          {routes.map((route, index) => (
            <Route key={index} path={route.path} element={route.element} />
          ))}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <AppLayout>
          <Routes>
            {routes.map((route, index) => (
              <Route key={index} path={route.path} element={route.element} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      )}
      <Toaster />
    </>
  );
}

/**
 * 可测试的路由壳
 * 不包含 BrowserRouter，可以在测试中用 MemoryRouter 包装
 */
export const AppRoutes: React.FC = () => {
  return (
    <RouteGuard>
      <AppContent />
    </RouteGuard>
  );
};
