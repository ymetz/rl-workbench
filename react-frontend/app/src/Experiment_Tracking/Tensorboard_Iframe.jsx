import React, { Component } from 'react';
import Iframe from 'react-iframe';

export default class tensorboard_iframe extends Component {
    constructor(props) {
        super(props);
        this.state = { width: 0, height: 0 };
        this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
    }

    /**
     * Only update and render the Component when all required data for the image component is loaded.
     * Reduces loading time on change of displayed images significantly.
     * @param {*} nextProps
     * @param {*} nextState
     */
    shouldComponentUpdate(nextProps, nextState) {
        if (this.props !== nextProps) {
            return true;
        }
        return false;
    }

    UNSAFE_componentWillMount() {
        this.updateWindowDimensions();
        window.addEventListener('resize', this.updateWindowDimensions);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updateWindowDimensions);
    }

    updateWindowDimensions() {
        this.setState({ width: window.innerWidth, height: window.innerHeight });
    }

    render() {
        return (
            <div>
                <Iframe
                    url="http://localhost:6006/#scalars"
                    width={this.state.width}
                    height={this.state.height - 20}
                    display="initial"
                />
            </div>
        );
    }
}
