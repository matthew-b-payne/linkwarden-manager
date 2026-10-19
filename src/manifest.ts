import fs from 'fs-extra';

interface ManifestChrome {
  manifest_version: number;
  name: string;
  version: string;
  description: string;
  homepage_url: string;
  action: {
    default_popup: string;
    default_icon: {
      [key: number]: string;
    };
    default_title: string;
  };
  options_ui: {
    page: string;
    open_in_tab: boolean;
  };
  background: {
    service_worker: string;
    type: string;
  };
  optional_host_permissions: string[];
  icons: {
    [key: number]: string;
  };
  permissions: string[];
  commands?: {
    [key: string]: {
      suggested_key: {
        default: string;
        mac?: string;
        windows?: string;
        chromeos?: string;
        linux?: string;
      };
      description: string;
    };
  };
}

interface ManifestFirefox {
  manifest_version: number;
  name: string;
  version: string;
  description: string;
  homepage_url: string;
  browser_action: {
    default_popup: string;
    default_icon: {
      [key: number]: string;
    }
    default_title: string;
  };
  options_ui: {
    page: string;
    browser_style: boolean;
    open_in_tab: boolean;
  };
  icons: {
    [key: number]: string;
  };
  permissions: string[];
  background: {
    scripts: string[];
    persistent: boolean;
    type: string;
  };
  commands?: {
    [key: string]: {
      suggested_key: {
        default: string;
        mac?: string;
        windows?: string;
        chromeos?: string;
        linux?: string;
      };
      description: string;
    };
  };
  browser_specific_settings: {
    gecko: {
      id: string;
      strict_min_version: string;
      data_collection_permissions: {
        required: string[];
      };
    }
  }
}

const createBaseChromeManifest = async (): Promise<ManifestChrome> => {
  try {
    const pkg = await fs.readJSON('package.json');

    return {
      manifest_version: 3,
      name: pkg.longName ?? pkg.name ?? 'GIVE ME A NAME',
      version: pkg.version,
      description: pkg.description ?? 'GIVE ME A DESCRIPTION',
      homepage_url: 'https://github.com/matthew-b-payne/linkwarden-manager',
      // Paths are package-root-relative with no `./` prefix: Chrome itself resolves `./x`, but the
      // Web Store's package validator does not, and rejects the upload with "the icon file
      // ./assets/icon-128.png is missing from the uploaded package".
      action: {
        default_popup: 'src/scripts/popup/popup.html',
        default_icon: {
          16: 'assets/icon-16.png',
          48: 'assets/icon-48.png',
          128: 'assets/icon-128.png',
        },
        default_title: pkg.longName ?? pkg.name ?? 'GIVE ME A NAME',
      },
      options_ui: {
        page: 'src/scripts/options/options.html',
        open_in_tab: true,
      },
      background: {
        service_worker: 'js/service-worker.js',
        type: 'module',
      },
      icons: {
        16: 'assets/icon-16.png',
        48: 'assets/icon-48.png',
        128: 'assets/icon-128.png',
      },
      permissions: ['storage', 'alarms', 'tabs', 'activeTab', 'windows'],
      // The user's Linkwarden instance can be at any address, so no fixed origin can be declared;
      // requested at runtime for that one origin when the host is saved in Options, which keeps
      // the install free of the "read and change all your data on all websites" warning.
      optional_host_permissions: ['*://*/*'],
      commands: {
        add_current_tab: {
          suggested_key: {
            default: 'Ctrl+Shift+S',
            mac: 'Command+Shift+S',
          },
          description: 'Save current tab to Linkwarden',
        },
      },
    };
  } catch (error) {
    console.error('Error reading package.json: ', error);
    throw error;
  }
};

const createBaseFirefoxManifest = async (): Promise<ManifestFirefox> => {
  try {
    const pkg = await fs.readJSON('package.json');

    return {
      manifest_version: 2,
      name: pkg.longName ?? pkg.name ?? 'GIVE ME A NAME',
      version: pkg.version,
      description: pkg.description ?? 'GIVE ME A DESCRIPTION',
      homepage_url: 'https://github.com/matthew-b-payne/linkwarden-manager',
      browser_action: {
        default_popup: 'src/scripts/popup/popup.html',
        default_icon: {
          16: 'assets/icon-16.png',
          48: 'assets/icon-48.png',
          128: 'assets/icon-128.png',
        },
        default_title: pkg.longName ?? pkg.name ?? 'GIVE ME A NAME',
      },
      options_ui: {
        page: 'src/scripts/options/options.html',
        browser_style: false,
        open_in_tab: true,
      },
      background: {
        scripts: ['js/service-worker.js'],
        persistent: true,
        type: 'module',
      },
      icons: {
        16: 'assets/icon-16.png',
        48: 'assets/icon-48.png',
        128: 'assets/icon-128.png',
      },
      permissions: [
        'storage',
        'alarms',
        'activeTab',
        'tabs',
        '<all_urls>',
      ],
      commands: {
        add_current_tab: {
          suggested_key: {
            default: 'Ctrl+Shift+S',
            mac: 'Command+Shift+S',
          },
          description: 'Save current tab to Linkwarden',
        },
      },
      browser_specific_settings: {
        gecko: {
          id: "linkwarden-manager@matthew-b-payne.github.io",
          // 113 is the first Firefox with oklch() and color-mix() enabled by default, both of
          // which the accent-colour tokens in src/styles/index.css depend on.
          strict_min_version: "113.0",
          // Required by AMO for new submissions since 2025-11-03. These match PRIVACY.md:
          // the API token, saved link content, tab URLs on save, and favicon hostnames sent
          // to DuckDuckGo. "none" would be a false declaration.
          data_collection_permissions: {
            required: [
              "authenticationInfo",
              "websiteContent",
              "browsingActivity",
              "websiteActivity",
            ],
          },
        }
      }
    };
  } catch (error) {
    console.error('Error reading package.json: ', error);
    throw error;
  }
};

const getManifest = async (): Promise<ManifestChrome | ManifestFirefox> => {
  const target = process.env.TARGET_BROWSER || 'CHROME';

  if (target === 'CHROME') {
    return await createBaseChromeManifest();
  }
  if (target === 'FIREFOX') {
    return await createBaseFirefoxManifest();
  }

  throw new Error(`Unknown TARGET_BROWSER "${target}": expected CHROME or FIREFOX`);
};


export const writeManifest = async (): Promise<void> => {
  try {
    const manifest = await getManifest();

    fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
  } catch (error) {
    console.error('Issue writing manifest.json: ', error);
    throw error;
  }
};
