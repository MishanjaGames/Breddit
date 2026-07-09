import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="col-md-8 mx-auto mt-5">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Помилка</h4>
            <p>Щось пішло не так. Будь ласка, перезавантажте сторінку.</p>
            <hr />
            <small>{this.state.error?.message}</small>
            <button 
              className="btn btn-sm btn-outline-danger mt-2 ms-2" 
              onClick={() => window.location.reload()}
            >
              Перезавантажити
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
