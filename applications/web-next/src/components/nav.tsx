type NavItem = {
  label: string;
  href: string;
};

type NavProps = {
  items: NavItem[];
  activeHref?: string;
};

export function Nav({ items, activeHref }: NavProps) {
  return (
    <nav className="flex gap-4 px-3 py-2 border-b border-border whitespace-nowrap font-medium">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={activeHref === item.href ? "text-text" : "text-text-secondary hover:text-text"}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
