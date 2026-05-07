import { V2Resource } from './_base';

/** A published module discoverable in the marketplace. */
export interface MarketplacePublication {
  publicationId: string;
  moduleId: string;
  name: string;
  description?: string;
  author?: string;
  category?: string;
  tags?: string[];
  priceCents?: number;
  installs?: number;
  rating?: number;
  publishedAt?: string;
  [key: string]: unknown;
}

/** Browse-marketplace params. */
export interface MarketplaceBrowseParams {
  category?: string;
  query?: string;
  page?: number;
  size?: number;
  sort?: string;
}

/** Install-action params. */
export interface MarketplaceInstallParams {
  acceptPaid?: boolean;
  configOverrides?: Record<string, unknown>;
}

/** Installed marketplace artefact. */
export interface MarketplaceInstallation {
  installationId: string;
  publicationId: string;
  installedAt: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Marketplace — browse and install published modules into your workspace.
 */
export class Marketplace extends V2Resource {
  list(params?: MarketplaceBrowseParams): Promise<MarketplacePublication[] | { publications: MarketplacePublication[] }> {
    return this.request('GET', '/v2/marketplace', undefined, params as Record<string, unknown>);
  }

  get(publicationId: string): Promise<MarketplacePublication> {
    return this.request('GET', `/v2/marketplace/${encodeURIComponent(publicationId)}`);
  }

  install(publicationId: string, params?: MarketplaceInstallParams): Promise<MarketplaceInstallation> {
    return this.request(
      'POST',
      `/v2/marketplace/${encodeURIComponent(publicationId)}/install`,
      params || {}
    );
  }

  listInstallations(): Promise<MarketplaceInstallation[]> {
    return this.request('GET', '/v2/marketplace/installations');
  }

  uninstall(installationId: string): Promise<void> {
    return this.request<void>(
      'DELETE',
      `/v2/marketplace/installations/${encodeURIComponent(installationId)}`
    );
  }
}
