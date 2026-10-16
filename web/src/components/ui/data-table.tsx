'use client';

import type { ReactNode } from 'react';
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

export function DataTable<TData>({
  columns,
  data,
  empty,
  getRowClassName,
  onRowClick,
  rowActionColumn,
  rowActionLabel,
  columnClassNames,
  className,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  empty?: ReactNode;
  getRowClassName?: (row: TData) => string | undefined;
  onRowClick?: (row: TData) => void;
  rowActionColumn?: string;
  rowActionLabel?: (row: TData) => string;
  columnClassNames?: Record<string, string>;
  className?: string;
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={cn('card overflow-x-auto', className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-[#fafafb]">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className={columnClassNames?.[header.column.id]}>
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
                  getRowClassName?.(row.original),
                )}
                onClick={
                  onRowClick ? () => onRowClick(row.original) : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={columnClassNames?.[cell.column.id]}>
                    {onRowClick && cell.column.id === rowActionColumn ? (
                      <button
                        type="button"
                        className="inventory-object-link"
                        aria-label={rowActionLabel?.(row.original)}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRowClick(row.original);
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </button>
                    ) : flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
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
