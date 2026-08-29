import { Component } from 'react';
import EmptyState from './EmptyState.jsx';

// 렌더 중 예외로 앱 전체가 흰 화면이 되는 것을 막는 전역 경계.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <EmptyState
            emoji="⚠️"
            title="문제가 발생했어요"
            description="화면을 표시하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
            action={<button type="button" className="btn btn-primary" onClick={this.handleReset}>다시 시도</button>}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
