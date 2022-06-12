import React, { Component } from 'react';
import * as d3 from 'd3';
import { config } from '../app_config';

export default class env_diagram extends Component {
    constructor(props) {
        super(props);
        this.envDiagramRef = React.createRef();
    }

    componentDidMount() {
        this.drawChart(this.props.data, this.props.benchmarkTime);
    }

    componentDidUpdate() {
        this.drawChart(this.props.data, this.props.benchmarkTime);
    }

    drawChart(data, benchmarkTime) {
        const margin = { top: 0, right: 0, bottom: 10, left: 0 };
        const svgWidth = this.envDiagramRef.current.clientWidth - margin.left - margin.right;
        const svgHeight = 280 - margin.top - margin.bottom;

        d3.select(this.envDiagramRef.current).select('*').remove();

        const svg = d3
            .select(this.envDiagramRef.current)
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .append('g');

        svg.append('rect')
            .attr('x', svgWidth * 0.1)
            .attr('y', 0)
            .attr('height', 50)
            .attr('width', svgWidth * 0.75)
            .attr('fill', '#767676')
            .attr('stroke', '#000000');

        svg.append('rect')
            .attr('x', 0)
            .attr('y', 10)
            .attr('height', 10)
            .attr('width', svgWidth * 0.1)
            .attr('fill', function () {
                return config.observation_space_color;
            });

        svg.append('rect')
            .attr('x', 10)
            .attr('y', 180)
            .attr('height', 10)
            .attr('width', 5)
            .attr('fill', function () {
                return config.observation_space_color;
            });

        svg.append('rect')
            .attr('x', 0)
            .attr('y', 10)
            .attr('height', 180)
            .attr('width', 10)
            .attr('fill', function () {
                return config.observation_space_color;
            });

        svg.append('path')
            .attr('d', 'M 13 170 L ' + svgWidth * 0.1 + ' 185 L 13 200 Z')
            .attr('fill', function () {
                return config.observation_space_color;
            });

        svg.append('rect')
            .attr('x', svgWidth * 0.85 + 5)
            .attr('y', 10)
            .attr('height', 10)
            .attr('width', 15)
            .attr('fill', function () {
                return config.action_space_color;
            });

        svg.append('rect')
            .attr('x', svgWidth * 0.85)
            .attr('y', 180)
            .attr('height', 10)
            .attr('width', 20)
            .attr('fill', function () {
                return config.action_space_color;
            });

        svg.append('rect')
            .attr('x', svgWidth * 0.9 + 5)
            .attr('y', 10)
            .attr('height', 180)
            .attr('width', 10)
            .attr('fill', function () {
                return config.action_space_color;
            });

        svg.append('path')
            .attr(
                'd',
                'M ' + svgWidth * 0.85 + ' 15 L ' + (svgWidth * 0.85 + 10) + ' 0 L ' + (svgWidth * 0.85 + 10) + ' 30 Z'
            )
            .attr('fill', function () {
                return config.action_space_color;
            });

        svg.append('rect')
            .attr('x', svgWidth * 0.5 - 5)
            .attr('y', 50)
            .attr('height', 100)
            .attr('width', 10)
            .attr('fill', function () {
                return config.reward_color;
            });

        svg.append('path')
            .attr(
                'd',
                'M ' + (svgWidth * 0.5 - 10) + ' 150 L ' + svgWidth * 0.5 + ' 160 L ' + (svgWidth * 0.5 + 10) + ' 150 Z'
            )
            .attr('fill', function () {
                return config.reward_color;
            });

        svg.append('text')
            .attr('x', svgWidth * 0.5)
            .attr('y', 25)
            .text(function () {
                return data.env_name !== '' ? 'Env: ' + data.env_name : 'Select Environment';
            })
            .attr('text-anchor', 'middle')
            .attr('dominant-baselines', 'middle');

        svg.append('rect')
            .attr('x', svgWidth * 0.1)
            .attr('y', 160)
            .attr('height', 50)
            .attr('width', svgWidth * 0.75)
            .attr('fill', '#b9b9b9')
            .attr('stroke', '#000000');

        svg.append('text')
            .attr('x', svgWidth * 0.5)
            .attr('y', 185)
            .text(function () {
                return 'Random Agent';
            })
            .attr('text-anchor', 'middle')
            .attr('dominant-baselines', 'middle');

        if (benchmarkTime && benchmarkTime.nr_of_steps > 0) {
            const time_per_thousand = benchmarkTime.benchmark_time * (1000 / benchmarkTime.nr_of_steps);
            const text = svg
                .append('text')
                .attr('x', svgWidth * 0.5)
                .attr('y', 70)
                .attr('text-anchor', 'middle')
                .attr('dominant-baselines', 'middle');

            text.append('tspan')
                .text(function () {
                    return 'Total BM Time: ';
                })
                .attr('x', svgWidth * 0.5)
                .attr('dy', 0)
                .attr('dx', -70);

            text.append('tspan')
                .text(function () {
                    return 'Time / 1k steps:';
                })
                .attr('x', svgWidth * 0.5)
                .attr('dy', 0)
                .attr('dx', 70);

            text.append('tspan')
                .text(function () {
                    return (benchmarkTime.benchmark_time * 1000).toFixed(3) + 'ms';
                })
                .attr('x', svgWidth * 0.5)
                .attr('dy', 15)
                .attr('dx', -70);

            text.append('tspan')
                .text(function () {
                    return (time_per_thousand * 1000).toFixed(3) + 'ms';
                })
                .attr('x', svgWidth * 0.5)
                .attr('dy', 0)
                .attr('dx', 70);
        }
    }

    render() {
        return <div ref={this.envDiagramRef}></div>;
    }
}
