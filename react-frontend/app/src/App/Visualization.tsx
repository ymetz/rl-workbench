import React from 'react';
import { DataArray } from 'types/DataArray';
import { Margins } from 'types/Margins';
import { Group } from '@visx/group';
import { GridColumns, GridRows } from '@visx/grid';
import { scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import DataPointComponent from 'App/DataPointComponent';

const DEFAULT_MARGINS: Margins = {
    left: 40,
    top: 10,
    bottom: 40,
    right: 10,
};

interface Props {
    data: DataArray;
    width: number;
    height: number;
    margins?: Margins;
}

const Visualization: React.FunctionComponent<Props> = ({ data, width, height, margins = DEFAULT_MARGINS }: Props) => {
    // figure bounds
    const xMax = width - margins.left - margins.right;
    const yMax = height - margins.top - margins.bottom;

    // scales
    const xValues = data.map((d) => d.x);
    const xScale = scaleLinear<number>()
        .domain([Math.min(...xValues), Math.max(...xValues)])
        .range([0, xMax]);

    const yValues = data.map((d) => d.y);
    const yScale = scaleLinear<number>()
        .domain([Math.min(...yValues), Math.max(...yValues)])
        .range([0, yMax]);

    const dataValues = data.map((d) => d.value);
    const valueScale = scaleLinear<number>()
        .domain([Math.min(...dataValues), Math.max(...dataValues)])
        .range([0, 10]);

    return (
        <svg width={width} height={height}>
            <Group left={margins.left} top={margins.top}>
                <GridRows scale={yScale} width={xMax} height={yMax} stroke="#e0e0e0" />
                <GridColumns scale={xScale} width={xMax} height={yMax} stroke="#e0e0e0" />
                <line x1={xMax} x2={xMax} y1={0} y2={yMax} stroke="#e0e0e0" />
                <AxisBottom top={yMax} scale={xScale} />
                <AxisLeft scale={yScale} />
                <text x="-70" y="15" transform="rotate(-90)" fontSize={10}>
                    y
                </text>
                {data.map((d, idx) => (
                    <DataPointComponent key={idx} x={xScale(d.x)} y={yScale(d.y)} value={valueScale(d.value)} />
                ))}
            </Group>
        </svg>
    );
};

export default Visualization;
