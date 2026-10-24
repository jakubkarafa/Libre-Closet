import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { I18nContext } from 'nestjs-i18n';
import { User } from '../dal/entity/user.entity';

// Black or white, whichever reads better on the given #rrggbb (WCAG relative luminance).
function readableContent(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? '#000000' : '#ffffff';
}

@Injectable()
export class ViewContextService {
  private logger = new Logger(ViewContextService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async buildContext(req: FastifyRequest) {
    const locale = I18nContext.current()?.lang ?? 'en';
    const path = req.url.split('?')[0];
    const protocol =
      (req.headers['x-forwarded-proto'] as string) ?? req.protocol;
    const host = (req.headers['x-forwarded-host'] as string) ?? req.hostname;
    const canonicalUrl = `${protocol}://${host}${path}`;
    const ogLocaleMap: Record<string, string> = {
      en: 'en_US',
      ru: 'ru_RU',
      es: 'es_ES',
      fr: 'fr_FR',
      it: 'it_IT',
      de: 'de_DE',
      da: 'da_DK',
    };

    const siteUrl = this.configService.get<string>('SITE_URL') ?? host;
    const baseUrl = `${protocol}://${host}`;
    const appName = this.configService.get<string>('APP_NAME');
    const appDescription =
      'Self-hosted wardrobe organizer. Catalog clothes with photos, build outfits, and install as an offline PWA. Free and open-source. No subscription, no ads.';
    const ogImage = `${baseUrl}/assets/lazztech_icon.png`;
    // Optional brand colours (validated #rrggbb in app.module) override the daisyUI theme variables.
    const themeStyle =
      (['primary', 'accent'] as const)
        .map((name) => {
          const color = this.configService.get<string>(
            `${name.toUpperCase()}_COLOR`,
          );
          return color
            ? `--color-${name}:${color};--color-${name}-content:${readableContent(color)};`
            : '';
        })
        .join('') +
      // Optional corner rounding (validated CSS lengths in app.module): cards / modals, buttons / inputs, checkboxes / badges.
      (['box', 'field', 'selector'] as const)
        .map((name) => {
          const radius = this.configService.get<string>(
            `RADIUS_${name.toUpperCase()}`,
          );
          return radius ? `--radius-${name}:${radius};` : '';
        })
        .join('');

    const context: Record<string, any> = {
      appName,
      themeStyle,
      logoUrl: this.configService.get<string>('LOGO_URL'),
      customCssUrl: this.configService.get<string>('CUSTOM_CSS_URL'),
      siteUrl,
      baseUrl: req.url === '/' ? '' : req.url,
      authEnabled: this.configService.get<boolean>('AUTH_ENABLED'),
      signupsDisabled: this.configService.get<boolean>('DISABLE_REGISTRATION'),
      pwaEnabled: this.configService.get<boolean>('PWA_ENABLED'),
      showSupporterPrompt:
        this.configService.get<boolean>('SUPPORTER_PROMPT_ENABLED') &&
        path !== '/' &&
        !path.startsWith('/auth'),
      locale,
      canonicalUrl,
      ogUrl: canonicalUrl,
      ogLocale: ogLocaleMap[locale] ?? 'en_US',
      ogTitle: appName,
      ogDescription: appDescription,
      ogImage,
    };

    try {
      const token = (req.cookies as Record<string, string>)?.['access_token'];
      if (token) {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
        });
        const user = await this.userRepository.findOne({ id: payload.userId });
        context.user = user;
      }
    } catch {
      this.logger.debug('User payload not available');
    }

    return context;
  }
}
