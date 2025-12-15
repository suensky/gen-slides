import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled UI error', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{this.state.error.message}</p>
          <button
            className="mt-4 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
            onClick={() => window.location.assign('/')}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }
}

