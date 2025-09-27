package com.example.shuttlemonitor.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Parent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long parentId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String fullName;

    private String contactPhone;

    private String currentAddress;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Student> children = new ArrayList<>();
}