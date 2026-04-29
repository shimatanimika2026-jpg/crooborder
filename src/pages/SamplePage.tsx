/**
 * Sample Page
 */

import { useTranslation } from 'react-i18next';
import PageMeta from "../components/common/PageMeta";

export default function SamplePage() {
  const { t } = useTranslation();
  return (
    <>
      <PageMeta title="Home" description="Home Page Introduction" />
      <div>
        <h3>This is a sample page</h3>
      </div>
    </>
  );
}
