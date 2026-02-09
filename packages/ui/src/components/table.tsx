import {
  forwardRef,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "../utils/cn";

type TableProps = HTMLAttributes<HTMLTableElement> & {
  columns?: string;
};

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, columns, style, ...props }, ref) => (
    <table
      className={cn("w-full text-sm", columns && "grid *:contents", className)}
      ref={ref}
      style={columns ? { ...style, gridTemplateColumns: columns } : style}
      {...props}
    />
  )
);
Table.displayName = "Table";

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead className={className} ref={ref} {...props} />
));
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody className={className} ref={ref} {...props} />
));
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    className={cn(
      "col-span-full grid grid-cols-subgrid last:[&>td]:border-b-0",
      className
    )}
    ref={ref}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    className={cn(
      "border-border border-b px-2 py-1.5 text-left font-medium text-muted-foreground text-xs",
      className
    )}
    ref={ref}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    className={cn(
      "flex items-center border-border border-b px-2 py-1.5 text-xs",
      className
    )}
    ref={ref}
    {...props}
  />
));
TableCell.displayName = "TableCell";
