/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-purity",
      severity: "error",
      comment:
        "domain/ ne doit dependre que d'autres fichiers de domain/ : aucun import " +
        "d'application/, infrastructure/, presentation/, config/, ni d'aucune lib npm " +
        "(pas meme Express ou Inversify). Le domaine reste du TypeScript pur.",
      from: { path: "^src/domain" },
      to: { pathNot: "^src/domain" },
    },
    {
      name: "application-purity",
      severity: "error",
      comment:
        "application/ ne doit dependre que de domain/, application/, des symboles DI " +
        "partages (src/types.ts) et d'inversify (necessaire aux decorateurs " +
        "@injectable/@inject) — jamais infrastructure/, presentation/, ni une lib HTTP.",
      from: { path: "^src/application" },
      to: {
        pathNot: [
          "^src/domain",
          "^src/application",
          "^src/types\\.ts$",
          "^node_modules/inversify",
        ],
      },
    },
    {
      name: "presentation-purity",
      severity: "error",
      comment:
        "presentation/ ne doit dependre que de domain/, application/, presentation/, " +
        "des symboles DI partages (src/types.ts), d'inversify et d'express — jamais " +
        "infrastructure/ directement : tout passe par ce que container.ts a injecte.",
      from: { path: "^src/presentation" },
      to: {
        pathNot: [
          "^src/domain",
          "^src/application",
          "^src/presentation",
          "^src/types\\.ts$",
          "^node_modules/inversify",
          "^node_modules/express",
        ],
      },
    },
    {
      name: "no-concrete-adapter-outside-container",
      severity: "error",
      comment:
        "Seul container.ts (la composition root) a le droit d'importer un adapter " +
        "concret. Partout ailleurs dans src/, on ne doit dependre que des ports du " +
        "domaine (Geocoder, WeatherProvider, HttpClient) — jamais NominatimGeocoder, " +
        "BanGeocoder, OpenMeteoWeatherProvider, MetNorwayWeatherProvider ou " +
        "FetchHttpClient directement.",
      from: { path: "^src/", pathNot: ["^src/infrastructure", "^src/container\\.ts$"] },
      to: {
        path: [
          "^src/infrastructure/geocoding/NominatimGeocoder\\.ts$",
          "^src/infrastructure/geocoding/BanGeocoder\\.ts$",
          "^src/infrastructure/weather/OpenMeteoWeatherProvider\\.ts$",
          "^src/infrastructure/weather/MetNorwayWeatherProvider\\.ts$",
          "^src/infrastructure/http/FetchHttpClient\\.ts$",
          "^src/infrastructure/cache/CachingGeocoder\\.ts$",
          "^src/infrastructure/cache/InMemoryCache\\.ts$",
          "^src/infrastructure/demo/DemoGeocoder\\.ts$",
          "^src/infrastructure/demo/DemoWeatherProvider\\.ts$",
        ],
      },
    },
    {
      name: "demo-adapters-no-network",
      severity: "error",
      comment:
        "Les adapters de demo ne peuvent dependre que de domain/ : ni HttpClient, ni config, " +
        "ni lib npm. C'est ce qui garantit structurellement que le mode demo n'appelle " +
        "jamais un service externe.",
      from: { path: "^src/infrastructure/demo" },
      to: { pathNot: "^src/domain" },
    },
    {
      name: "cache-decorator-adapter-agnostic",
      severity: "error",
      comment:
        "Le decorateur de cache ne doit connaitre que les ports (Geocoder, Cache), jamais un " +
        "adapter concret ou HttpClient : le geocodeur enveloppe lui est injecte par le container.",
      from: { path: "^src/infrastructure/cache" },
      to: { path: "^src/infrastructure/(geocoding|weather|http|demo)" },
    },
    {
      name: "nominatim-dto-private",
      severity: "error",
      comment:
        "NominatimTypes.ts decrit le format brut de l'API Nominatim : c'est un DTO " +
        "d'anti-corruption prive a NominatimGeocoder.ts. Aucun autre fichier (autre " +
        "adapter, ForecastService, test de contrat...) ne doit l'importer.",
      from: { pathNot: "^src/infrastructure/geocoding/NominatimGeocoder\\.ts$" },
      to: { path: "^src/infrastructure/geocoding/NominatimTypes\\.ts$" },
    },
    {
      name: "ban-dto-private",
      severity: "error",
      comment:
        "BanTypes.ts decrit le format brut de l'API BAN : c'est un DTO d'anti-corruption " +
        "prive a BanGeocoder.ts. Aucun autre fichier ne doit l'importer.",
      from: { pathNot: "^src/infrastructure/geocoding/BanGeocoder\\.ts$" },
      to: { path: "^src/infrastructure/geocoding/BanTypes\\.ts$" },
    },
    {
      name: "open-meteo-dto-private",
      severity: "error",
      comment:
        "OpenMeteoTypes.ts decrit le format brut de l'API Open-Meteo : c'est un DTO " +
        "d'anti-corruption prive a OpenMeteoWeatherProvider.ts. Aucun autre fichier ne " +
        "doit l'importer.",
      from: { pathNot: "^src/infrastructure/weather/OpenMeteoWeatherProvider\\.ts$" },
      to: { path: "^src/infrastructure/weather/OpenMeteoTypes\\.ts$" },
    },
    {
      name: "met-norway-dto-private",
      severity: "error",
      comment:
        "MetNorwayTypes.ts decrit le format brut de l'API MET Norway : c'est un DTO " +
        "d'anti-corruption prive a MetNorwayWeatherProvider.ts. Aucun autre fichier ne " +
        "doit l'importer.",
      from: { pathNot: "^src/infrastructure/weather/MetNorwayWeatherProvider\\.ts$" },
      to: { path: "^src/infrastructure/weather/MetNorwayTypes\\.ts$" },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "node", "default"],
      extensions: [".ts", ".js"],
    },
    doNotFollow: { path: "node_modules" },
  },
};
