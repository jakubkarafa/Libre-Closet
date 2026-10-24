import { getRepositoryToken } from '@mikro-orm/nestjs';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { FastifyRequest } from 'fastify';
import { User } from '../dal/entity/user.entity';
import { ViewContextService } from './view-context.service';

describe('ViewContextService', () => {
  const req = {
    url: '/',
    headers: {},
    protocol: 'http',
    hostname: 'localhost',
    cookies: {},
  } as unknown as FastifyRequest;

  async function contextWith(config: Record<string, string>) {
    const module = await Test.createTestingModule({
      providers: [
        ViewContextService,
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => config[key]) },
        },
      ],
    }).compile();
    return module.get(ViewContextService).buildContext(req);
  }

  it('leaves the theme and logo alone by default', async () => {
    const context = await contextWith({});
    expect(context.themeStyle).toBe('');
    expect(context.logoUrl).toBeUndefined();
    expect(context.customCssUrl).toBeUndefined();
  });

  it('sets brand colours with a readable content colour', async () => {
    const context = await contextWith({
      PRIMARY_COLOR: '#14B8A6',
      ACCENT_COLOR: '#143935',
    });
    expect(context.themeStyle).toBe(
      '--color-primary:#14B8A6;--color-primary-content:#000000;' +
        '--color-accent:#143935;--color-accent-content:#ffffff;',
    );
  });

  it('sets corner rounding', async () => {
    const context = await contextWith({
      RADIUS_BOX: '22px',
      RADIUS_FIELD: '999px',
    });
    expect(context.themeStyle).toBe('--radius-box:22px;--radius-field:999px;');
  });

  it('passes LOGO_URL to the navbar', async () => {
    const context = await contextWith({ LOGO_URL: '/assets/logo.svg' });
    expect(context.logoUrl).toBe('/assets/logo.svg');
  });

  it('passes CUSTOM_CSS_URL to the layout', async () => {
    const context = await contextWith({ CUSTOM_CSS_URL: '/custom/theme.css' });
    expect(context.customCssUrl).toBe('/custom/theme.css');
  });
});
