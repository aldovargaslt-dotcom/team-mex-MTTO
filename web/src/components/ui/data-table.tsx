'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const AFFORDANCE_COLUMN: ColumnDef<unknown, unknown> = {
  id: '_affordance',
  header: () => <span className="sr-only">Abrir</span>,
  cell: () => (
    <span className="row-affordance" aria-hidden>
      <ChevronRight strokeWidth={1.75} />
    </span>
  ),
};

export function DataTable<TData>({
  columns,
  data,
  empty,
  getRowClassName,
  onRowClick,
  rowAffordance = false,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  empty?: ReactNode;
  getRowClassName?: (row: TData) => string | undefined;
  onRowClick?: (row: TData) => void;
  rowAffordance?: boolean;
}) {
  const resolvedColumns = rowAffordance
    ? [...columns, AFFORDANCE_COLUMN as ColumnDef<TData, unknown>]
    : columns;
  const table = useReactTable({
    data,
    columns: resolvedColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: TData) {
    if (!onRowClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  }

  return (
    <div className="card overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-[#fafafb]">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={
                    header.column.id === '_affordance' ? 'w-9 px-2' : undefined
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  onRowClick && 'cursor-pointer',
                  rowAffordance && 'row-clickable',
                  getRowClassName?.(row.original),
                )}
                tabIndex={rowAffordance && onRowClick ? 0 : undefined}
                onClick={
                  onRowClick ? () => onRowClick(row.original) : undefined
                }
                onKeyDown={
                  rowAffordance && onRowClick
                    ? (event) => onRowKeyDown(event, row.original)
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={
                      cell.column.id === '_affordance' ? 'w-9 px-2' : undefined
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={resolvedColumns.length}
                className="h-10 text-left text-muted-foreground"
              >
                {empty ?? 'Sin registros.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
