/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30">
        <Dashboard />
      </div>
    </ErrorBoundary>
  );
}
