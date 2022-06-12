import React from 'react';
import { PureComponent } from 'react';
import BCSwarmEnvironment from './BCSwarmEnvironment';
import BCSwarmEnvironmentNewEncoding from './BCSwarmEnvironmentNewEncoding';
import BCSwarmEnvironmentNoPos from './BCSwarmEnvironmentNoPos';
import { config } from '../app_config';

/**
 * Here we need to "register" our custom rendering environments.
 * Furthermore, they also have to specified in the app_config.js file under
 * 'custom_rendering_support' which links an env name with a key used
 * in his provider component
 *
 * Make sure, that app_config and this provider component are in sync.
 * I know, this is a bit hacky, might be improved in the future.
 */
export default class CustomRenderingProvider extends PureComponent {
    render() {
        return (
            <>
                {Object.values(config.custom_rendering_support).includes(this.props.renderingEnv) &&
                    {
                        bc_swarm_env: (
                            <BCSwarmEnvironment
                                renderData={this.props.renderData}
                                secRenderData={this.props.secRenderData}
                                renderDims={{
                                    x_min: -10,
                                    x_max: 10,
                                    y_min: -10,
                                    y_max: 10,
                                }}
                                dataTimestamp={this.props.dataTimestamp}
                            />
                        ),
                        bc_swarm_env_sincos: (
                            <BCSwarmEnvironmentNewEncoding
                                renderData={this.props.renderData}
                                secRenderData={this.props.secRenderData}
                                renderDims={{
                                    x_min: -10,
                                    x_max: 10,
                                    y_min: -10,
                                    y_max: 10,
                                }}
                                dataTimestamp={this.props.dataTimestamp}
                            />
                        ),
                        bc_swarm_env_nopos: (
                            <BCSwarmEnvironmentNoPos
                                renderData={this.props.renderData}
                                secRenderData={this.props.secRenderData}
                                renderDims={{
                                    x_min: -10,
                                    x_max: 10,
                                    y_min: -10,
                                    y_max: 10,
                                }}
                                dataTimestamp={this.props.dataTimestamp}
                            />
                        ),
                    }[this.props.renderingEnv]}
            </>
        );
    }
}
