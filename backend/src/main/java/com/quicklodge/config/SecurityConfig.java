package com.quicklodge.config;

import com.quicklodge.security.AuthEntryPoint;
import com.quicklodge.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configuration Spring Security : JWT stateless, CORS (frontend React port 3000),
 * règles d'accès par chemin et rôle.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final AuthEntryPoint authEntryPoint;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(authEntryPoint))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/type-etablissement/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/type-chambre/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/type-chambres").permitAll()
                        .requestMatchers(HttpMethod.GET, "/type-chambres/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/type-badge/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/type-notification/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/etablissements/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/files/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/avis/**").permitAll()
                        .requestMatchers("/reservations/**").hasAnyRole("CLIENT", "HOST", "ADMIN")
                        // Chambres : propriété vérifiée dans ChambreService (propriétaire de l'établissement).
                        // JWT encore « CLIENT » après 1er établissement → éviter 403 tant que pas de re-login.
                        .requestMatchers(HttpMethod.POST, "/chambres").authenticated()
                        .requestMatchers(HttpMethod.POST, "/host/chambres").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/host/chambres/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/host/chambres/**").authenticated()
                        // 1er établissement : CLIENT autorisé ; UserService active ROLE_HOST en base (refresh JWT pour le reste /host).
                        .requestMatchers(HttpMethod.POST, "/host/etablissements").authenticated()
                        .requestMatchers(HttpMethod.GET, "/host/etablissements/mes").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/host/etablissements/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/host/etablissements/**").authenticated()
                        .requestMatchers("/host/**").hasAnyRole("HOST", "ADMIN")
                        .requestMatchers("/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
