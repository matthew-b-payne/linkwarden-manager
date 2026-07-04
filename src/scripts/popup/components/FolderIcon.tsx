import React, { useEffect, useState } from "react";
import { Folder, FolderOpen } from "lucide-react";
import type { IconProps } from "@phosphor-icons/react";

// copied from Linkwarden: apps/web/components/Icon.tsx
// modified to handle cases where the icon is not found in the phosphor-icons module
// icons are loaded lazily (one chunk per icon, cached after first use) instead of
// bundling the entire ~1500-icon phosphor-icons package into the popup bundle

type IconComponentType = React.ComponentType<IconProps>;

const iconLoaders = import.meta.glob<Record<string, IconComponentType>>(
  "/node_modules/@phosphor-icons/react/dist/csr/*.es.js",
);

const iconComponentCache = new Map<string, IconComponentType | null>();

const loadIconComponent = (icon: string): Promise<IconComponentType | null> => {
  if (iconComponentCache.has(icon)) {
    return Promise.resolve(iconComponentCache.get(icon)!);
  }

  const loader = iconLoaders[`/node_modules/@phosphor-icons/react/dist/csr/${icon}.es.js`];
  if (!loader) {
    iconComponentCache.set(icon, null);
    return Promise.resolve(null);
  }

  return loader()
    .then((module) => module[icon] ?? null)
    .catch(() => null)
    .then((component) => {
      iconComponentCache.set(icon, component);
      return component;
    });
};

type Props = {
  icon: string;
  isOpen: boolean;
} & IconProps;

const FolderIcon = ({ icon, isOpen, ...rest }: Props) => {
  const [IconComponent, setIconComponent] = useState<IconComponentType | null>(
    () => iconComponentCache.get(icon) ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    setIconComponent(iconComponentCache.get(icon) ?? null);

    loadIconComponent(icon).then((component) => {
      if (!cancelled) {
        setIconComponent(component);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [icon]);

  if (!IconComponent) {
    return isOpen ? <FolderOpen {...rest} /> : <Folder {...rest} />;
  }
  return <IconComponent {...rest} />;
};

FolderIcon.displayName = "Icon";

export default FolderIcon;
