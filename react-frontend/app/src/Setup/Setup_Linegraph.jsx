import React, { PureComponent } from 'react';
import { DropdownButton, ButtonGroup, Dropdown, Row } from 'react-bootstrap';
import '../css/Setup.module.css';
import * as d3 from 'd3';

export default class Setup_linegraph extends PureComponent {
    constructor(props) {
        super(props);
        this.linegraphRef = React.createRef();

        this.state = {
            rew_aggr_mode: 'step_reward',
        };
    }

    componentDidMount() {
        this.drawChart(
            this.prepareData(this.props.data),
            this.props.lineColor,
            this.props.setHighlight,
            this.props.highlightSteps
        );
    }

    componentDidUpdate() {
        if (this.props.data.length > 0) {
            this.drawChart(
                this.prepareData(this.props.data),
                this.props.lineColor,
                this.props.setHighlight,
                this.props.highlightSteps
            );
        }
    }

    prepareData(data) {
        const rew_data = data[0];
        const done_data = data[1];
        let out_data = new Array(rew_data.length);
        if (this.state.rew_aggr_mode === 'step_reward') {
            out_data = rew_data;
        } else if (this.state.rew_aggr_mode === 'acc_reward') {
            let current_sum = 0.0;
            for (let i = 0; i < rew_data.length; i++) {
                current_sum += rew_data[i];
                out_data[i] = current_sum;
                if (done_data[i] === true) current_sum = 0.0;
            }
        } else if (this.state.rew_aggr_mode === 'real_value') {
            let current_sum = 0.0;
            for (let i = rew_data.length - 1; i >= 0; i--) {
                current_sum += rew_data[i];
                out_data[i] = current_sum;
                if (done_data[i] === true) current_sum = 0.0;
            }
        }

        const done_idx = done_data.reduce((a, elem, i) => (elem === true && a.push(i), a), []);

        return { rews: out_data, dones: done_idx };
    }

    setRewardAggrMode(new_mode) {
        const mode = new_mode;
        this.setState({ rew_aggr_mode: mode });
    }

    drawChart(data, lineColor, setHighlight, highlightSteps) {
        const { rews, dones } = data;

        const margin = { top: 10, right: 30, bottom: 20, left: 10 };
        const svgWidth = Math.max(this.linegraphRef.current.parentElement.clientWidth - margin.left - margin.right, 0);
        const svgHeight = Math.max(240 - margin.top - margin.bottom, 0);
        const x_domain = rews.length > 0 ? rews.length - 1 : 1024;

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
        const xAxis = svg.append("g")
            .attr("transform", "translate(0," + svgHeight + ")")
            .call(d3.axisBottom(x));

        const y_domain = rews.length > 0 ? [d3.min(rews), d3.max(rews)] : [-1, 1];
        const y = d3.scaleLinear().range([svgHeight, 0]).domain(y_domain);

        svg.append('g')
            .call(d3.axisRight(y).tickSize(svgWidth))
            .call((g) => g.select('.domain').remove())
            .call((g) =>
                g
                    .selectAll('.tick:not(:first-of-type) line')
                    .attr('stroke-opacity', 0.5)
                    .attr('stroke-dasharray', '2,2')
            )
            .call((g) => g.selectAll('.tick text').attr('x', 4).attr('dy', -4));

        const brush = d3.brushX()
            .extent([[0, 0], [svgWidth, svgHeight]])
            .on("end", updateChart);
        //.on("click", mouseclick);

        const done_lines = svg.append("g")
            .selectAll("line")
            .data(dones)
            .enter()
            .append("line")
            .attr("x1", d => x(d))
            .attr("x2", d => x(d))
            .attr("y1", 0)
            .attr("y2", svgHeight)
            .attr("stroke", "#a0a0a0");

        const data_path = svg
            .append("path")
            .datum(rews)
            .attr("fill", "none")
            .attr("stroke", lineColor)
            .attr("stroke-width", 2.5)
            .attr("d", d3.line()
                .x(function (d, i) { return x(i); })
                .y(function (d) { return y(d); })
            );

        svg.append('g').attr('class', 'brush').call(brush);

        const step_line_g = svg.append("g");

        const step_line = step_line_g
            .append("rect")
            .attr("x", x(highlightSteps.new.value) - 2)
            .attr("y", 0)
            .attr("height", svgHeight)
            .attr("width", 4)
            .attr("fill", "#ff3737")
            .attr("opacity", 0.6);

        const step_line_point = step_line_g
            .append("circle")
            .attr("cx", x(highlightSteps.new.value))
            .attr("cy", y(rews[highlightSteps.new.value]))
            .attr("r", 5)
            .attr("opacity", 0.6)
            .attr("fill", "#ff3737")
            .call(d3.drag()
                .on("drag", dragPoint)
                .on('end', dragEnd));



        if (
            highlightSteps.new &&
            (highlightSteps.new.bottom !== highlightSteps.previous.bottom ||
                highlightSteps.new.top !== highlightSteps.previous.top)
        ) {
            x.domain([highlightSteps.new.bottom, highlightSteps.new.top]);
            svg.select('.brush').call(brush.move, null);

            // Update axis and circle position
            xAxis.transition().duration(750).call(d3.axisBottom(x));

            data_path
                .transition()
                .duration(750)
                .attr(
                    'd',
                    d3
                        .line()
                        .x(function (d, i) {
                            return x(i);
                        })
                        .y(function (d) {
                            return y(d);
                        })
                );

            done_lines
                .transition()
                .duration(750)
                .attr('x1', (d) => x(d))
                .attr('x2', (d) => x(d));

            step_line.transition().duration(750).attr('x', x(highlightSteps.new.value));
            step_line_point.transition().duration(750).attr('cx', x(highlightSteps.new.value));
        }

        function dragPoint() {
            const mousePos = d3.pointer(this);
            step_line.attr('x', mousePos[0]);
            step_line_point.attr('cx', mousePos[0]).attr('cy', mousePos[1]);
        }

        function dragEnd() {
            const mouseX = d3.pointer(this)[0];
            const x0 = Math.round(x.invert(mouseX));
            setHighlight({ bottom: highlightSteps.new.bottom, top: highlightSteps.new.top, value: x0 });
        }

        function mouseclick() {
            const x0 = Math.round(x.invert(d3.pointer(this)[0]));
            setHighlight({ bottom: 0, top: 1024, value: x0 });
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
                setHighlight({ bottom: 0, top: x_domain, value: 0 });
            } else {
                setHighlight({
                    bottom: Math.floor(x.invert(extent[0])),
                    top: Math.floor(x.invert(extent[1])),
                    value: Math.floor(x.invert(extent[0])),
                });
            }
        }
    }

    render() {
        return (
            <Row>
                <DropdownButton
                    as={ButtonGroup}
                    key="reward_aggregation_dropdown"
                    id="reward_aggregation_dropdown_"
                    onSelect={this.setRewardAggrMode.bind(this)}
                    className="rew_agg_dropdown_button"
                    variant="link"
                    title="Reward Aggregation Mode"
                >
                    <Dropdown.Item eventKey="step_reward" active={this.state.rew_aggr_mode === 'step_reward'}>
                        Step Reward
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="acc_reward" active={this.state.rew_aggr_mode === 'acc_reward'}>
                        Accumulative Reward
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="real_value" active={this.state.rew_aggr_mode === 'real_value'}>
                        Future Acc. Reward (Value)
                    </Dropdown.Item>
                </DropdownButton>
                <div ref={this.linegraphRef}></div>
            </Row>
        );
    }
}
