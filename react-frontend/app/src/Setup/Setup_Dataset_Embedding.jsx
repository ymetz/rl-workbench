import React, { PureComponent } from 'react';
import { Collapse } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
import { legend } from '../Common/Color_Legend';
import * as d3 from 'd3';

export default class Setup_Dataset_Embedding extends PureComponent {
    constructor(props) {
        super(props);
        this.embeddingRef = React.createRef();
        this.colorLegendRef = React.createRef();

        this.state = {
            data_timestamp: 0,
            collapse_explainer_window: true,
        };
    }

    componentDidMount() {
        if (this.props.dataTimestamp > this.state.data_timestamp) {
            this.setState(
                { data_timestamp: this.props.dataTimestamp },
                this.drawChart(
                    this.props.datasetEmbedding,
                    this.props.selectDatapoint,
                    this.props.selected,
                    this.props.dataPointIndices,
                    this.props.datasetLength
                )
            );
        }
    }

    componentDidUpdate() {
        if (this.props.dataTimestamp > this.state.data_timestamp) {
            this.setState(
                { data_timestamp: this.props.dataTimestamp },
                this.drawChart(
                    this.props.datasetEmbedding,
                    this.props.selectDatapoint,
                    this.props.selected,
                    this.props.dataPointIndices,
                    this.props.datasetLength
                )
            );
        } else {
            this.updateChartColors(this.props.selected);
        }
    }

    updateChartColors(currentSteps) {
        const svg = d3.select(this.embeddingRef.current.current);
        svg.select('#datapoint_' + currentSteps.value)
            .attr('fill', '#ff4d00')
            .attr('r', 7)
            .raise();
    }

    drawChart(data, selectDatapointFn, selected_datapoint, dataset_indices, dataset_length) {
        const margin = { top: 0, right: 0, bottom: 0, left: 0 };
        d3.select(this.embeddingRef.current.current).select('*').remove();
        const svgWidth = this.embeddingRef.current.parentElement.clientWidth - margin.left - margin.right;
        const svgHeight = 650 - margin.top - margin.bottom;
        if (svgWidth < 0 || svgHeight < 0) return;

        const svg = d3
            .select(this.embeddingRef.current.current)
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom);

        const svgG = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const x = d3
            .scaleLinear()
            .domain([d3.max(data.map((d) => d[0])), d3.min(data.map((d) => d[0]))])
            .range([0, svgWidth]);
        const xAxis = d3
            .axisBottom(x)
            .ticks(((svgWidth + 2) / (svgHeight + 2)) * 5)
            .tickSize(svgHeight)
            .tickPadding(8 - svgHeight);

        const y = d3
            .scaleLinear()
            .range([svgHeight, 0])
            .domain([d3.max(data.map((d) => d[1])), d3.min(data.map((d) => d[1]))]);
        const yAxis = d3
            .axisRight(y)
            .ticks(5)
            .tickSize(svgWidth)
            .tickPadding(8 - svgWidth);

        const zoom = d3
            .zoom()
            .scaleExtent([0.8, 40])
            .translateExtent([
                [-300, -300],
                [svgWidth + 300, svgHeight + 300],
            ])
            .on('zoom', zoomed);

        const gX = svgG.append('g').attr('class', 'axis-embed axis--x').call(xAxis);

        const gY = svgG.append('g').attr('class', 'axis-embed axis--y').call(yAxis);

        const view = svgG.append('g');

        view.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('height', svgHeight)
            .attr('width', svgWidth)
            .style('opacity', '0');

        const rects = view
            .append('g')
            .selectAll('rect')
            .data(data.map((d, i) => [d[0], d[1], i]))
            .enter()
            .append('rect')
            .attr('x', (d) => x(d[0]))
            .attr('y', (d) => y(d[1]))
            .attr('width', 10)
            .attr('height', 10)
            //.attr("stroke", (d,i) => "black")
            .attr('opacity', 0.8)
            .attr('fill', (d) => d3.interpolateViridis(dataset_indices[d[2]] / dataset_length))
            .attr('id', (d) => 'datapoint_' + d[2])
            .on('click', circleClick);

        rects.attr('transform', 'translate(-5, -5)');

        svg.call(zoom);

        d3.select(this.colorLegendRef.current.current).select('*').remove();

        d3.select(this.colorLegendRef.current.current)
            .node()
            .appendChild(
                legend({
                    color: d3.scaleSequential([0, 1], d3.interpolateViridis),
                    title: 'Position in Dataset (as Fraction of Total Elements)',
                    width: this.colorLegendRef.current.parentElement.clientWidth - 15,
                    tickFormat: '%',
                })
            );

        //svg.call(lasso);

        function zoomed(event) {
            view.attr('transform', event.transform);
            gX.call(xAxis.scale(event.transform.rescaleX(x)));
            gY.call(yAxis.scale(event.transform.rescaleY(y)));
        }

        function circleClick(d) {
            selectDatapointFn(d[2], dataset_indices[d[2]]);
        }
    }

    render() {
        return (
            <div>
                <div
                    style={{
                        width: '15%',
                        position: 'absolute',
                        top: 15,
                        right: 15,
                        marginRight: 15,
                        padding: 5,
                        backgroundColor: 'rgba(240, 240, 240, 0.6)',
                        zIndex: 2,
                    }}
                >
                    <p>
                        <b>Dataset Embedding</b>
                        <FontAwesomeIcon
                            icon={faCaretDown}
                            onClick={() => {
                                const old_toggle = this.state.collapse_explainer_window;
                                this.setState({ collapse_explainer_window: !old_toggle });
                            }}
                        />
                    </p>
                    <Collapse in={this.state.collapse_explainer_window}>
                        <div>
                            <p>
                                Each square in the embedding represents a sample from the dataset. Each sample consits
                                of the selected number of consecutive steps. Samples are grouped to each other based on
                                observation similarity.
                            </p>
                            <p>Samples are color-coded according to the index position in the dataset.</p>
                        </div>
                    </Collapse>
                    <div ref={this.colorLegendRef}></div>
                </div>
                <div ref={this.embeddingRef}></div>
            </div>
        );
    }
}
