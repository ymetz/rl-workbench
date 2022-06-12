import React, { PureComponent } from 'react';
import '../css/Evaluation.module.css';
import * as d3 from 'd3';

export default class Embedding_rewardgrapg extends PureComponent {
    constructor(props) {
        super(props);
        this.linegraphRef = React.createRef();
        this.state = {
            rew_aggr_mode: 'acc_reward',
        };
    }

    componentDidMount() {
        this.drawChart(this.props.dones, this.props.changeHighlight, this.props.highlightSteps);
    }

    componentDidUpdate() {
        if (this.props.dones.length > 0)
            this.drawChart(this.props.dones, this.props.changeHighlight, this.props.highlightSteps);
    }

    drawChart(dones, changeHighlight, highlightSteps) {
        const margin = { top: 20, right: 30, bottom: 20, left: 10 };
        const svgWidth = this.linegraphRef.current.parentElement.clientWidth - margin.left - margin.right;
        const svgHeight = 40 - margin.top - margin.bottom;
        const x_domain = dones.length > 0 ? dones.length - 1 : 1024;

        d3.select(this.linegraphRef.current.current).select('*').remove();

        const svg = d3
            .select(this.linegraphRef.current.current)
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const x = d3
            .scaleLinear()
            .domain([highlightSteps.previous.bottom, highlightSteps.previous.top])
            .range([0, svgWidth]);
        const xAxis = svg
            .append('g')
            .attr('transform', 'translate(0,' + svgHeight + ')')
            .call(d3.axisBottom(x));

        svg.append('g')
            .call((g) => g.select('.domain').remove())
            .call((g) =>
                g
                    .selectAll('.tick:not(:first-of-type) line')
                    .attr('stroke-opacity', 0.5)
                    .attr('stroke-dasharray', '2,2')
            )
            .call((g) => g.selectAll('.tick text').attr('x', 4).attr('dy', -4));

        const brush = d3
            .brushX()
            .extent([
                [0, 0],
                [svgWidth, svgHeight],
            ])
            .on('end', updateChart);
        //.on("click", mouseclick);

        const done_lines = svg
            .append('g')
            .selectAll('circle')
            .data(dones)
            .enter()
            .append('circle')
            .attr('dx', (d) => x(d))
            .attr('dy', 0)
            .attr('r', 5)
            .attr('fill', '#b0b0b0')
            .attr('stroke', '#5b5b5b');

        svg.append('g').attr('class', 'brush').call(brush);

        const step_line_g = svg.append('g');

        const step_line = step_line_g
            .append('rect')
            .attr('x', x(highlightSteps.new.value) - 2)
            .attr('y', 5)
            .attr('height', svgHeight + 5)
            .attr('width', 4)
            .attr('fill', '#ff3737')
            .attr('opacity', 0.6);

        const step_line_point = step_line_g
            .append('circle')
            .attr('cx', x(highlightSteps.new.value))
            .attr('cy', 15)
            .attr('r', 5)
            .attr('opacity', 0.6)
            .attr('fill', '#ff3737')
            .call(d3.drag().on('drag', dragPoint));

        if (
            highlightSteps.new &&
            (highlightSteps.new.bottom !== highlightSteps.previous.bottom ||
                highlightSteps.new.top !== highlightSteps.previous.top)
        ) {
            x.domain([highlightSteps.new.bottom, highlightSteps.new.top]);
            svg.select('.brush').call(brush.move, null);

            // Update axis and circle position
            xAxis.transition().duration(750).call(d3.axisBottom(x));

            step_line.transition().duration(750).attr('x', x(highlightSteps.new.value));
            step_line_point.transition().duration(750).attr('cx', x(highlightSteps.new.value));
        }

        function dragPoint() {
            const mouseX = d3.pointer(this)[0];
            const x0 = Math.round(x.invert(mouseX));
            changeHighlight({ bottom: highlightSteps.new.bottom, top: highlightSteps.new.top, value: x0 });
        }

        function mousemove() {
            const mouseX = d3.pointer(this)[0];
            const x0 = Math.round(x.invert(mouseX));
            const selectedData = rews[x0];
            focus.attr('cx', x(x0)).attr('cy', y(selectedData));
            focusText
                .html('step: ' + (x0 + 1) + ' reward: ' + selectedData.toFixed(2))
                .attr('x', x(x0) + 10)
                .attr('y', y(selectedData));
            if (mouseX < svgWidth / 2) {
                focusText.attr('text-anchor', 'start');
            } else {
                focusText.attr('text-anchor', 'end');
            }
        }

        function mouseout() {
            focus.style('opacity', 0);
            focusText.style('opacity', 0);
        }

        function mouseclick() {
            const x0 = Math.round(x.invert(d3.pointer(this)[0]));
            changeHighlight({ bottom: 0, top: 1024, value: x0 });
            focus.style('opacity', 0);
            focusText.style('opacity', 0);
        }

        let idleTimeout;
        function idled() {
            idleTimeout = null;
        }

        function updateChart(event) {
            const extent = event.selection;
            const select_x = [0, 0];

            // If no selection, back to initial coordinate. Otherwise, update X axis domain
            if (!extent) {
                if (!idleTimeout) return (idleTimeout = setTimeout(idled, 350)); // This allows to wait a little bit
                changeHighlight({ bottom: 0, top: x_domain, value: 0 });
            } else {
                changeHighlight({
                    bottom: Math.floor(x.invert(extent[0])),
                    top: Math.floor(x.invert(extent[1])),
                    value: Math.floor(x.invert(extent[0])),
                });
            }
        }
    }

    render() {
        return (
            <div>
                <div ref={this.linegraphRef}></div>
            </div>
        );
    }
}
