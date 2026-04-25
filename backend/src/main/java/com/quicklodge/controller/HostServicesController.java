package com.quicklodge.controller;

import com.quicklodge.dto.request.service.CreateServiceRequest;
import com.quicklodge.dto.request.service.UpdateServiceRequest;
import com.quicklodge.dto.response.service.ServiceResponse;
import com.quicklodge.entity.CatalogueService;
import com.quicklodge.entity.CategorieService;
import com.quicklodge.entity.Service;
import com.quicklodge.exception.ForbiddenException;
import com.quicklodge.exception.ResourceNotFoundException;
import com.quicklodge.repository.ServiceRepository;
import com.quicklodge.repository.UserRepository;
import com.quicklodge.service.CatalogueServiceService;
import com.quicklodge.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/host")
@RequiredArgsConstructor
public class HostServicesController {

    private final CatalogueServiceService catalogueServiceService;
    private final ServiceRepository serviceRepository;
    private final UserRepository userRepository;

    @PostMapping("/services")
    public ResponseEntity<ServiceResponse> create(@Valid @RequestBody CreateServiceRequest request) {
        Long userId = getCurrentUserId();

        CatalogueService cs = catalogueServiceService.findByEtablissementId(request.getEtablissementId());
        if (cs == null) {
            cs = catalogueServiceService.create(request.getEtablissementId(), userId, "Catalogue");
        }

        if (!cs.getEtablissement().getProprietaire().getId().equals(userId)) {
            throw new ForbiddenException("Vous n'êtes pas le propriétaire de cet établissement");
        }

        Service s = Service.builder()
                .libelle(request.getLibelle())
                .categorie(request.getCategorie() != null ? request.getCategorie() : CategorieService.AUTRE)
                .prix(request.getPrix())
                .unite(request.getUnite())
                .actif(request.getActif() != null ? request.getActif() : true)
                .catalogue(cs)
                .build();

        // cs appartient au propriétaire connecté (vérifié ci-dessus)
        s = serviceRepository.save(s);
        return ResponseEntity.ok(toResponse(s));
    }

    @PutMapping("/services/{id}")
    public ResponseEntity<ServiceResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateServiceRequest request) {
        Long userId = getCurrentUserId();

        Service s = serviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service", "id", id));

        if (!s.getCatalogue().getEtablissement().getProprietaire().getId().equals(userId)) {
            throw new ForbiddenException("Vous n'êtes pas le propriétaire de ce service");
        }

        if (request.getLibelle() != null) s.setLibelle(request.getLibelle());
        if (request.getCategorie() != null) s.setCategorie(request.getCategorie());
        if (request.getPrix() != null) s.setPrix(request.getPrix());
        if (request.getUnite() != null) s.setUnite(request.getUnite());
        if (request.getActif() != null) s.setActif(request.getActif());

        s = serviceRepository.save(s);
        return ResponseEntity.ok(toResponse(s));
    }

    @DeleteMapping("/services/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = getCurrentUserId();

        Service s = serviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service", "id", id));

        if (!s.getCatalogue().getEtablissement().getProprietaire().getId().equals(userId)) {
            throw new ForbiddenException("Vous n'êtes pas le propriétaire de ce service");
        }

        Long catalogueId = s.getCatalogue().getId();
        catalogueServiceService.removeService(catalogueId, id, userId);
        return ResponseEntity.noContent().build();
    }

    private ServiceResponse toResponse(Service s) {
        return ServiceResponse.builder()
                .id(s.getId())
                .libelle(s.getLibelle())
                .categorie(s.getCategorie())
                .prix(s.getPrix())
                .unite(s.getUnite())
                .actif(s.getActif())
                .createdAt(s.getCreatedAt())
                .build();
    }

    private Long getCurrentUserId() {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email == null) throw new com.quicklodge.exception.UnauthorizedException("Non authentifié");
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new com.quicklodge.exception.UnauthorizedException("Utilisateur introuvable"))
                .getId();
    }
}

