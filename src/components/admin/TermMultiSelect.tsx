'use client';

import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Badge, Button, Checkbox, Flex, Popover, ScrollArea, Text } from '@radix-ui/themes';
import type { TermNode } from '@/lib/taxonomy';
import { flatten } from '@/lib/taxonomy';

type Props = {
  label: string;
  tree: TermNode[];
  value: string[];
  onChange: (value: string[]) => void;
  invalid?: boolean;
  describedBy?: string;
};

/** 통제 어휘 다중 선택. taxonomy_terms 키만 고를 수 있다(F-06) */
export function TermMultiSelect({ label, tree, value, onChange, invalid, describedBy }: Props) {
  const nodes = flatten(tree);
  const labels = new Map(nodes.map((n) => [n.key, n.label]));
  return (
    <div className="ct-field">
      <span className="ct-label">{label}</span>
      <Popover.Root>
        <Popover.Trigger>
          <Button
            variant="surface"
            color={invalid ? 'red' : 'gray'}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            aria-label={`${label}: ${value.map((k) => labels.get(k) ?? k).join(', ') || '선택 안 함'}`}
            style={{ justifyContent: 'space-between', height: 'auto', minHeight: 36, padding: '4px 10px' }}
          >
            <Flex wrap="wrap" gap="1">
              {value.length === 0 ? (
                <Text color="gray">키를 선택하세요</Text>
              ) : (
                value.map((k) => (
                  <Badge key={k} color="gray" variant="soft">
                    {labels.get(k) ?? k}
                  </Badge>
                ))
              )}
            </Flex>
            <ChevronDownIcon />
          </Button>
        </Popover.Trigger>
        <Popover.Content width="320px" align="start">
          <ScrollArea style={{ maxHeight: 300 }}>
            <Flex direction="column" gap="2" pr="3">
              {nodes.map((n) => (
                <Text as="label" key={n.key} size="2" className="ct-check" style={{ paddingLeft: n.depth * 22 }}>
                  <Checkbox
                    checked={value.includes(n.key)}
                    onCheckedChange={(checked) =>
                      onChange(checked ? [...value, n.key] : value.filter((k) => k !== n.key))
                    }
                  />
                  <span>
                    {n.label} <Text color="gray" size="1" className="ct-mono">{n.key}</Text>
                  </span>
                </Text>
              ))}
            </Flex>
          </ScrollArea>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
