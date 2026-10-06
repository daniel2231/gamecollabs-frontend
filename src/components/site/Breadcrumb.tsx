import { Link as RadixLink, Text } from '@radix-ui/themes';
import { Link } from '@/i18n/navigation';

export function Breadcrumb({ label, items }: { label: string; items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label={label} style={{ marginBottom: 20 }}>
      <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'inline-flex', gap: 8 }}>
            {i > 0 && (
              <Text size="2" color="gray" aria-hidden="true">
                /
              </Text>
            )}
            {item.href ? (
              <RadixLink asChild size="2" color="gray">
                <Link href={item.href}>{item.label}</Link>
              </RadixLink>
            ) : (
              <Text size="2" highContrast aria-current="page">
                {item.label}
              </Text>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
