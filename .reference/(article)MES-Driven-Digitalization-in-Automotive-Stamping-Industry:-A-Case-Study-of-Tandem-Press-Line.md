# MES-Driven Digitalization in Automotive Stamping Industry: A Case Study of Tandem Press Line

**Science Essence Journal Vol. 42 No. 1 (2026) | 14-49**
**Research Article**

**Authors:** Piyush Dipak Bachhav<sup>1</sup>, Sudhir Madhav Patil<sup>1\*</sup>, Mitesh Shashikant Jadhav<sup>2</sup> and Harsh Dilip Kene<sup>1</sup>

- Received: 10 July 2025
- Revised: 27 September 2025
- Accepted: 30 September 2025

---

## ABSTRACT

The rapid evolution of smart manufacturing technologies has made Manufacturing Execution Systems (MES) central to improving efficiency, traceability, and quality in discrete manufacturing. This work investigates the end-to-end implementation of an MES solution in a newly established automotive stamping facility featuring a Tandem Press line. The objective is to explore how MES can be embedded from the initial design phase to achieve operational excellence in a green field manufacturing environment. A structured case study methodology was adopted, encompassing tandem press line layout design, MES system selection, infrastructure planning, digital workflow mapping, operator training, and real-time data integration with press automation systems. Performance metrics such as Overall Equipment Effectiveness (OEE), traceability, changeover time, and quality rate were defined during commissioning and monitored for seven months post-deployment. The MES implementation led to early stabilization of production parameters, with an OEE ramp-up from 47.17% in Month 1 (Sep. 2024) to 72.36% by Month 7 (Mar. 2025). Real-time visibility enabled a 37.50% reduction in changeover time and defect rate reduced from by 8.22% to 1.93%. Full digital traceability was achieved across material, machine, and operator layers from the first batch onward. The findings offer a replicable digital blueprint for MES integration in green field projects across the automotive stamping sector and other high-volume manufacturing domains. MES, when integrated from inception, transforms plant commissioning from a sequential execution into a data-driven optimization loop, accelerating productivity, standardization, and digital maturity from Day One.

**Keywords:** Automotive stamping, Digital transformation, Green field implementation, Industry 4.0, Manufacturing Execution System (MES), Smart manufacturing, Tandem press line

---

<sup>1</sup> Department of Manufacturing Engineering and Industrial Management, COEP Technological University (COEP Tech), Chhatrapati Shivajinagar, Pune: 411005, Maharashtra State, India
<sup>2</sup> Mahindra Accelo Ltd., Worli, Mumbai: 400018, Maharashtra State, India

\* Corresponding author, email: smp.prod@coeptech.ac.in

---

## Introduction

The advent of Industry 4.0 has significantly reshaped the manufacturing landscape by enabling real-time connectivity, monitoring, and control across production systems. At the center of this transformation is the Manufacturing Execution System (MES), a software layer that bridges the automation on the shop floor with enterprise-level systems such as Enterprise Resource Planning (ERP) [1]. MES plays a crucial role in capturing, analyzing, and acting on production data in real time to support decision-making, enhance efficiency, improve traceability, and ensure product quality [2, 3].

Since its emergence in the mid-1990s, MES has evolved from simple data collection systems into powerful platforms that can coordinate, monitor, and optimize end-to-end manufacturing operations. Seubert and Vokey define MES as a real-time software solution that manages and synchronizes manufacturing processes from raw materials (RMs) to finished goods (FGs), offering visibility and control across the production chain [4].

While MES implementation in brownfield plants - those with existing infrastructure - is common, its integration in green field facilities, where digital systems are embedded from the start, is relatively underexplored. Green field projects offer a unique opportunity to incorporate MES during the initial design and commissioning stages, free from legacy constraints. This approach enables optimized sensor layouts, early adoption of standardized data protocols, and effective workforce training [5, 6]. It also facilitates smoother change management by aligning people, processes, and technologies from the outset [7].

While MES implementation in brownfield plants - those with existing infrastructure is well documented, such deployments frequently encounter barriers such as legacy system integration, fragmented data flows, and workforce resistance to digital adoption [8]. Case studies in sectors like automotive assembly and process industries report long transition times and significant change-management costs when MES is introduced into established plants [9]. In contrast, research on green field MES deployments remains relatively limited, yet early evidence suggests that embedding MES from the inception stage allows for optimized sensor placement, adoption of standardized data protocols, and structured workforce training [5, 6]. By avoiding the constraints of legacy infrastructure, green field projects enable smoother alignment of people, processes, and technologies, thereby facilitating more effective change management [7, 10]. This critical contrast positions the present study as one of the first structured case studies of MES deployment in a green field high-tonnage automotive stamping facility, offering fresh insights into how early-stage integration accelerates digital maturity and operational readiness.

The automotive stamping industry, essential to vehicle production, transforms metal sheets into high-precision components such as body panels and structural reinforcements. In 2024, this sector was valued at approximately USD 86.5 billion, with projections estimating growth to around USD 113.2 billion by 2030 at a compound annual growth rate of 4.9% [11]. As demand increases, stamping operations are shifting from being purely mechanical to becoming digitally enabled.

A critical component of automotive stamping is the Tandem Press Line - a sequence of mechanical presses that operate in a coordinated manner to produce complex parts. These lines demand precision, minimal downtime, and cycle time stability to meet just-in-time manufacturing needs. Given the complexity and speed of these operations, real-time visibility and adaptive control are essential, making MES a fitting solution [12, 13].

Although several case studies have documented MES implementations in sectors like electrical manufacturing [14], pharmaceuticals [15], and continuous process industries [16], few focus on high-tonnage, discrete manufacturing environments like automotive stamping. These operations pose unique challenges such as die management, synchronized press control, and stringent quality tracking [12].

This work fills that gap by presenting a detailed case study on the implementation of MES in a green field automotive stamping facility equipped with a fully automated Tandem Press Line. Unlike brown field deployments, where MES is retrofitted around existing limitations, this study demonstrates a bottom-up integration approach. The MES system was considered from the initial factory layout to equipment specification, sensor placement, Standard Operating Procedure (SOP) design, and operator training.

Conducted in collaboration with a Tier-1 automotive supplier, this work evaluates the impact of MES integration during the plant's commissioning phase. The objectives include designing MES-enabled workflows, tracking performance indicators such as Overall Equipment Effectiveness (OEE), changeover time, and defect rates, and assessing the benefits realized during the first seven months of operation. The MES platform was chosen for its compatibility with existing Programmable Logic Controllers (PLCs), Human-Machine Interfaces (HMIs), and ERP systems, ensuring seamless integration.

Key contributions of this work include structured documentation of MES deployment aligned with International Society of Automation-95 (ISA-95) standards [17], customization of operator interfaces, and testing strategies. The study also explores human-centric aspects such as operator training, data trust, and dashboard-based decision-making. A "data-first" culture was fostered from Day One, avoiding legacy system constraints and embedding digital workflows into daily operations [18].

This paper advances the discourse on MES by shifting the focus from system retrofitting to proactive integration during plant inception. It illustrates how early-stage MES deployment in a green field stamping facility can enable faster ramp-up, improve operational readiness, and accelerate digital maturity. The insights derived from this study aim to guide manufacturers, system integrators, and researchers working toward digital factory realization in the Industry 4.0 era.

Beyond its practical relevance, MES adoption can also be interpreted through theoretical frameworks that explain digital transformation. The Reference Architecture Model for Industry 4.0 (RAMI 4.0) and the ISA-95 standard provide structured perspectives for aligning enterprise systems with shop-floor control [19]. Likewise, technology adoption models such as the Technology-Organization-Environment (TOE) framework and digital maturity models emphasize how manufacturing organizations evolve from early adoption toward integration and optimization [20]. Positioning this case study within these frameworks highlights not only the industrial benefits but also its academic contribution to understanding how green field facilities can accelerate digital transformation from inception.

The remainder of this paper is structured as follows. Section 2 describes the materials and methods adopted for the study, including the planning, design, and deployment phases of MES in the green field stamping facility. It also outlines the system architecture, data flow model, and definitions of key performance indicators (KPIs). Section 3 presents the results and discussion, highlighting empirical improvements in OEE, quality, and traceability, along with operator feedback and challenges encountered during implementation. Section 4 concludes the paper by summarizing the key findings, discussing limitations, and outlining future research directions, while reflecting on the academic and industrial contributions of this work.

---

## Materials and methods

This section outlines the structured methodology adopted for the implementation of the MES within a green field automotive stamping facility. This Case study followed a structured methodology for MES implementation in a green field automotive stamping facility. The approach is summarized in Figure 1, which illustrates the sequential research process from project initiation to evaluation. The methodology began with project scoping and layout mapping, followed by MES platform selection and architecture design. Next, the functional scope definition ensured alignment with operational objectives (OEE, production tracking, downtime monitoring, quality, and traceability). Equipment integration and workflow design were conducted in parallel with data mapping and configuration, while training and change management supported organizational readiness. The commissioning and go-live phase validated system performance, and finally, KPI monitoring and statistical analysis were undertaken to evaluate MES impact and enable continuous improvement.

> **[Figure 1 – diagram: timeline/process flow]**
> Steps, in order: (1) Define Project Context & Layout Mapping → (2) Select MES Platform & Design Architecture → (3) Define Functional Scope → (4) Design Equipment Integration & Operator Workflows → (5) Data Flow Mapping & MES Configuration → (6) Training & Change Management → (7) Commissioning & Go-Live Validation → (8) KPI Monitoring & Statistical Evaluation.

**Figure 1** Methodological Process Flow for MES Implementation Process.

### Green field project context and facility architecture

This case study is based on a newly established green field automotive stamping facility developed by a Tier-1 supplier for a major global automotive brand. The facility specializes in cold press stamping operations and features a fully automated tandem press line. It manufactures both Class A parts, such as outer body panels and roof sections that are visible on vehicles, and Class B parts like reinforcements, brackets, and Heating Ventilation and Air Conditioning (HVAC) ducts, which are internal structural components.

### Configuration of the tandem press line facility

At the core of this facility is a tandem press line composed of four sequential mechanical press units, interconnected through a robotic material handling system. Figure 2 shows the layout of the tandem press line, highlighting the arrangement of presses, robots, conveyors, inspection zones, and transfer areas to help understand the flow of materials. Each press performs a specific forming task: the first conducts deep drawing, the second handles trimming and shaping, the third executes piercing and flanging, and the final press ensures dimensional accuracy and surface finish. Dedicated tooling and die systems are used at each stage, with Quick Die Change (QDC) mechanisms [21] enabling fast and safe transitions, minimizing downtime. As per the specifications mentioned in Table 1, the tandem press line is designed for high-force applications, with large bolster areas that support flexible tooling setups.

Material flow across the line is managed by a fully automated transfer system. A blank de-stacker introduces RM at the front of the line, while robotic arms fitted with vacuum and mechanical grippers move parts between presses. These robots feature auto-adjustment functions to accommodate part size and shape variations without manual reconfiguration. Conveyors facilitate intra-line transport and move finished components toward the End-Of-Line (EOL) stations for inspection and packaging.

Real-time quality control is embedded throughout the line. Vision sensors and alignment detectors check positioning and surface conditions of parts during processing. Die protection sensors automatically halt operations in case of misfeeds or part misalignments. At the final checkpoint, trained operators perform manual inspections to confirm dimensions and surface quality.

> **[Figure 2 – layout diagram]**
> Labelled elements: Front of Line (FOL); Fork Lift; Conveyor; RM Blank; Blank De-stacker; Presses (numbered 1, 2, 3, 4, arranged left to right with an arrow showing flow direction); Die; Bolster; Robotic Inter-press Transfer; End of Line (EOL); FG Components; Physical inspection.

**Figure 2** Tandem press line layout with four interconnected mechanical presses.

**Table 1** Tandem press machine specification.

| Machine specifications | Press–1 | Press–2 | Press–3 | Press–4 |
|---|---|---|---|---|
| Nominal Capacity | 2000KN | 1000KN | 1000KN | 1000KN |
| Nominal Stroke | 13mm (all presses) | | | |
| Slide Stroke | 1400mm | 1250mm | 1250mm | 1250mm |
| Strokes per Minute | 7–15 SPM (all presses) | | | |
| Shut height | 1500 mm (all presses) | | | |
| Shut height Adjustment | 500 mm (all presses) | | | |
| Bolster Size (LR × FB)\* | 4800 × 2500 mm (all presses) | | | |
| Cushion Force | 4000KN (all presses) | | | |
| Cushion Stroke | 350mm (all presses) | | | |

\*LR Left to Right, FB Front to Back

The line is monitored and controlled via a network of PLCs and HMIs, which govern press sequencing, robotic movements, and safety interlocks. Operators interact through HMI panels that display diagnostics and alerts. Comprehensive safety mechanisms, including light curtains and emergency stop systems, are implemented to protect personnel.

Despite its high level of automation, the facility still requires a MES to ensure digital intelligence. While robots manage the physical operations, MES connects the process with enterprise systems like ERP, enabling structured production monitoring, traceability, and data-driven decision-making. Without MES, visibility into performance, downtime analysis, and quality metrics would rely on manual tracking, risking inefficiencies and data fragmentation. MES bridges this gap by capturing real-time data, facilitating automated reporting, and supporting compliance, thus elevating the automated line into a fully digitalized and intelligent production system.

### Configuration of the network architecture

To support MES deployment, a robust network architecture was developed, as illustrated in Figure 3. The facility integrates Information Technology (IT), Operational Technology (OT), and cyber security infrastructure tailored for a cloud-based MES environment. Dual Internet Leased Lines (ILLs) connect to Layer 1, comprised of Software-Defined Wide Area Network (SD-WAN) routers, ensuring continuous uptime and smart traffic routing for MES and ERP services. These connect to Layer 2 managed switches configured with Virtual Local Area Networks (VLANs) and Quality of Service (QoS) protocols to optimize communication for time-sensitive MES [1, 22].

> **[Figure 3 – network diagram]**
> Labelled elements: WAN (cloud); two ILL links; two SD-WAN routers; Managed Network switch-1 and Managed Network switch-2 (with port numbers 1, 6, 7, 8); Firewall-1 (two units, WAN interfaces, HA link between them, ports 1, 2, 3, A, 8, "Sub Interface"); OT_IDMZ; IT-core-Switch; OT-core-Switch; IT_LAN (switches with desktop and laptop PCs); OT_LAN (switches with desktop and laptop PCs).

**Figure 3** IT-OT-Cyber security architecture implemented at the green field plant.

A Layer 3 core switch sits at the center, handling routing and interfacing with a firewall that secures internal communications from external threats [23, 24]. The architecture is divided into two zones: the IT network, which handles enterprise systems, and the OT network, which manages shop floor devices. These are isolated by a firewall and communicate through an Industrial Demilitarized Zone (IDMZ) [25], enabling controlled data exchange between MES, ERP, and plant equipment.

Redundant fiber-optic and augmented category 6 (CAT6A) Ethernet cabling ensures fault-tolerant, high-speed communication throughout the facility. Edge switches collect local machine data and forward it to MES, enabling real-time analytics and traceability. The overall architecture complies with international standards (National Institute of Standards and Technology (NIST), RAMI 4.0)) and supports a scalable, secure, and high-performance digital manufacturing environment, forming the backbone for MES-enabled operations in this green field stamping facility [19, 26, 27].

---

## MES platform selection and architecture design

### MES platform selection

The selection of an appropriate MES platform for the green field automotive stamping facility was guided by a structured evaluation of commercial off-the-shelf (COTS) solutions. Table 2 presents the list of selection criterions while choosing the MES platform suitable for the stamping facility.

**Table 2** List of selection criterions with justification for choosing the MES platform.

| Sr. No. | Description | Justification |
|---|---|---|
| 1 | Compatibility with ISA-95 functional model | Ensures standardization and seamless integration between enterprise and shop floor systems. |
| 2 | Native support for real-time production monitoring | Enables immediate visibility into machine status and process deviations, essential for high-volume operations. |
| 3 | Customizability of workflows and user interfaces | Adapts MES to plant-specific needs, enhancing usability and reducing training time. |
| 4 | Integration Readiness with ERP, Customer Relationship Management (CRM), Product Lifecycle Management (PLM), Supply Chain Management (SCM) | Facilitates end-to-end data flow and synchronized operations across enterprise systems. |
| 5 | Vendor support for green field deployment projects | Ensures informed infrastructure design and MES integration from the ground up. |
| 6 | Support for hybrid cloud architecture | Balances local performance with cloud-based scalability and remote access. |
| 7 | Tool and die management capabilities | Tracks die usage and maintenance to reduce unplanned downtime. |
| 8 | Traceability and genealogy tracking | Links each part to its material and process history, meeting quality and regulatory requirements. |
| 9 | Digital quality management integration (Production Part Approval Process (PPAP), Failure Mode Effects Analysis (FMEA), Statistical Process Control (SPC), and Advanced Product Quality Planning APQP) | Supports structured quality planning and defect prevention in automotive manufacturing. |
| 10 | Analytics and reporting framework | Provides actionable insights from production data for continuous improvement. |
| 11 | User access control and cyber security features | Secures system access and protects plant data in a connected environment. |
| 12 | Scalability and Future Readiness | Ensures the system grows with operational needs and evolving technologies. |
| 13 | Ease of use and operator adoption | Enhances day-to-day efficiency and workforce engagement. |
| 14 | Pre-configured templates for stamping operations (Least dependency on vendor for MES configuration) | Accelerates implementation and minimizes vendor dependency. |
| 15 | Support for downtime categorization and root cause analysis, downtime auto-categorization via PLC signals | Enables automated, accurate tracking of downtime and diagnosis of underlying causes. |
| 16 | Mobile and remote accessibility | Allows monitoring and decision-making from any location. |
| 17 | Fast implementation timeline | Supports quicker go-live and ramp-up in green field projects. |
| 18 | Regulatory compliance and audit support conformance with International Automotive Task Force (IATF), International Organization for Standardization (ISO) | Simplifies documentation and ensures readiness for industry audits. |
| 19 | Edge device and PLC Integration capability | Ensures real-time data collection from shop floor equipment. |
| 20 | Data historian integration | Enables long-term storage and analysis of process data. |
| 21 | Configurable Andon display support | Enhances shop floor communication through visual display of status and KPIs. |
| 22 | Support for Artificial Intelligence (AI)/Machine Learning (ML) extensions | Allows future integration of predictive and intelligent analytics. |
| 23 | Multi-language and localization support | Facilitates use across diverse and global workforce environments. |
| 24 | Training, documentation, and post-go-live support | Ensures smooth adoption and sustained MES performance. |
| 25 | Role-based workflow triggers and escalations | Automates task routing and escalations based on user roles and priorities. |

### Hybrid MES architecture based on ISA-95

Figure 4 presents the hybrid MES architecture implemented for the tandem press line, structured according to the ISA-95 automation hierarchy. MES operates at Level 3, linking shop floor control systems (Levels 0–2) such as PLCs, Supervisory Control and Data Acquisition (SCADA), and sensors with enterprise-level tools like ERP, PLM, CRM, and SCM at Level 4.

The MES solution adopts a hybrid deployment model - cloud-based for core applications and on-premises for the historian database. This historian continuously captures time-series data such as stroke counts and cycle times directly from field devices over Ethernet, ensuring uninterrupted logging even during internet outages. When connectivity is restored, the historian synchronizes backlogged data with the cloud MES.

An Open Platform Communication - Unified Architecture (OPC–UA) layer enables secure, bidirectional communication between PLCs, the MES platform, and the historian. The Ethernet-based network ensures redundancy, maintaining real-time data flow and control even during network disruptions.

In addition to operational continuity, the historian supports long-term digital transformation. By archiving high-resolution process data, it enables future AI/ML applications like predictive maintenance and quality forecasting. This hybrid architecture bridges current monitoring needs with scalable, intelligent manufacturing capabilities.

> **[Figure 4 – layered architecture diagram]**
> - **Level 4: Business planning and logistics** – CRM, ERP, PLM, SCM (→ Product Delivery)
> - **Level 3: Manufacturing operations management** – MES, Historian Database (Historian → MES)
> - **Level 2: Monitoring and supervising control** – OPC, PLC
> - **Level 0,1: Field devices** – (motor/drive, HMI panel, robot, sensor)
> Links: Level 4 ↔ MES; MES ↔ OPC; OPC → Historian Database; OPC ↔ PLC; PLC ↔ field devices.

**Figure 4** Proposed hybrid architecture of MES based on ISA-95.

---

## MES functional scope definition

The MES implementation for the tandem press line was structured around key functional modules to support stamping operations, as outlined in Table 3. Initial deployment focused on production tracking, quality control, inventory management, and downtime logging, with full integration into the existing ERP system for real-time data exchange. The system enabled automated import of production orders, live work-in-progress tracking using barcode/Radio Frequency Identification (RFID), and PLC-driven downtime classification to monitor downtime related contributors such as Planned Downtime (PD), Unplanned Downtime (UD), minor stoppages less than 1 min.

MES also integrated with the Quality Management System (QMS) to capture in-line defects, enable SPC, and log Corrective and Preventive Action (CAPA) activities. A detailed traceability system linked RM batches, stroke counts, tooling IDs, and operator credentials for end-to-end part history. A real-time OEE dashboard provided visibility into availability, performance, and quality metrics.

**Table 3** Proposed MES functionalities.

| Module | Functional components |
|---|---|
| Manufacturing Operations | Part & Batch Tracking; Bill-of-Materials (BOM); Work Instructions / SOPs; Data Collection & Acquisition; Tooling Management; Label & Document Printing; Task Management; Operator Training & Certification; Order Management; Traceability & Genealogy |
| Equipment Engineering | Equipment Tracking; Maintenance Management; Calibration |
| Quality Management | SPC; CAPA; Electronic Signatures; Sampling Based Inspection / Acceptance Quality Limit (AQL); Document Management; Non-Conformance Reporting & Dispositions |
| Planning and Logistics | Materials Management; Advanced Planning & Scheduling\* |
| Business Intelligence | Dashboards; Operational Data Store & Data Warehouse; Reporting and Analytics; Alarm Management; Factory Digital Twin\*; Augmented Reality\* |
| Automation and Integration | Equipment Integration; Factory Automation; Workflow Management; Enterprise Integration (ERP, PLM, SCM, CRM) |
| Internet of Things (IoT) & Platform Support | IoT Data Platform |

*(Note: the asterisks appear in the original table without an explanatory footnote. Column grouping above was reconstructed from the PDF's text layout.)*

Digital work instructions guided operators via HMIs, while stroke-based die monitoring supported tool life management. IoT sensor data was continuously collected and stored in an on-premises historian for time-series analysis and future AI-driven applications.

The MES also enabled seamless integration with other enterprise systems such as PLM, CRM, and SCM. Vendor support was critical in configuration, training, and troubleshooting, ensuring a secure, scalable, and effective MES deployment tailored to stamping operations.

---

## MES-driven equipment and workflow design

Mapping MES functionalities to tandem press stations enabled real-time control, traceability, and automation across equipment and work flow. The MES-enabled workflow in the tandem press line ensures seamless integration with ERP, real-time process control, quality assurance, traceability, and data-driven decision-making throughout pre-production to batch closure.

### MES-driven equipment

The tandem press workflow was digitally modelled to align each station's physical role with specific MES functionalities as mentioned in the Table 4. Devices such as PLCs, HMIs, barcode scanners, and RFID readers were integrated to enable automated data capture, traceability, and quality control.

### Workflow design

Figure 5 illustrates the MES-enabled workflow architecture in a green field tandem press setup. The process begins with pre-production, where ERP transfers master data such as BOM, routing, and production parameters to the MES via Application Programming Interfaces (APIs). This triggers the generation of a digital job ticket. Upon RM receipt, barcode scanning ensures verification against MES records. If mismatches arise, interlocks prevent further processing, preserving traceability and compliance.

During setup, PLCs begin real-time data capture including stroke count, cycle time, and downtime. RFID-enabled die validation ensures correct tooling, and operator login links task responsibility to MES. First-piece production follows, using digital inspection checklists. Only upon quality clearance does MES allow full production to proceed.

In the execution phase, MES captures machine signals, logs downtime events, and enables automated escalations. In-process quality inspections are digitally recorded, while Andon displays provide real-time KPIs like OEE and defect rates. Final inspection and batch declaration involve recording good and defective parts, scrap reasons, and rework status. Validated batch data is transferred to ERP for reconciliation.

MES aggregates all process data into dashboards for OEE tracking, root cause analysis, and daily performance reviews. It enables traceability, rapid alerting, and insight generation essential for continuous improvement and future AI-driven strategies.

> **[Figure 5 – swimlane flowchart (small print, only partially legible in the source)]**
> Swimlanes (rows): **ERP**, **MES**, **Automation and Orchestration**, **Manual Interaction with MES**.
> Phase columns: **Pre-production Setup** | **Production Setup & First Piece Inspection** | **Production Execution** | **End of Batch and production Declaration** | **Business Analytics**.
> Legible elements include: Master data (Part, BOM, Routing, Parameters); Receive blanks / RM; Check RM/CTQ parameter; Start; Scanning of RM barcode; Fitting RM checksheet; Signals (stroke count, part count, line stop, production, minor stoppage, setup time, downtime reasons); Machine adjustment; Physically load RM in/to press; Trigger first piece inspection checksheet; Update MES dashboard; Update downtime log; Post real-time data on Andon board; Escalated quality inspection checkpoint; Operator triggers in-process quality inspection checksheet; Continue running production; Final Lot of Batch; Production declaration (part no., batch no., part description, customer details); Scrap Posting (part no., no. of parts, scrap reason); Update count of Scrap parts; Update count of Good parts; END; Daily work management (OEE, production tracking, quality management, downtime tracking, OEE calculation); Automated email trigger for any deviation in process; Performance dashboard, production, fault analysis, root cause analysis, quality analytics.

\*BOM: Bill of Material, CTQ: Critical to Quality, MTTR: Mean time to repair, MTBF: Mean time between failure, NG: Not good

**Figure 5** MES-enabled workflow and data flow across ERP, machine layer, and operator interfaces in a tandem press line.

**Table 4** Mapping of tandem press station, it's role and MES functionalities

| Tandem press station | Role in process flow | MES functionalities enabled | Key devices & interfaces |
|---|---|---|---|
| Destacker | Feeds raw blanks into the line | • Material batch logging<br>• Part ID assignment and genealogy tracking | • Barcode Scanner |
| Feeder Stations | Aligns and feeds blanks into respective presses | • Feed synchronization monitoring<br>• Alarm trigger on misfeed or double-blank detection | • PLC with encoder feedback<br>• Proximity sensors |
| Press 1 to Press 4 | Sequential stamping operations | • Stroke count capture<br>• Die ID logging (from RFID)<br>• Automatic downtime detection<br>• Tool-part traceability | • PLCs for real-time data capture<br>• HMI/ MES'S interface terminal for manual input<br>• RFID-tagged dies |
| Inspection Station | Performs quality checks post final press | • Real-time defect logging (visual and sensor-based)<br>• Traceability of defects to batch/operator/tool<br>• Trigger-based alerts to QMS | • Vision inspection system<br>• MES terminal for defect input |
| Conveyor System | Transfers finished components for packing | • Automatic part completion tagging<br>• Batch closure and FG declaration<br>• FG Sticker printing and stick-on Bin/Stillage | • Barcode scanning system<br>• MES interface terminal<br>• Barcode printer |
| Changeover Areas | Die/tool change management | • e-SOP execution<br>• Checkpoint validation<br>• Time tracking for Single-Minute Exchange of Die (SMED) analysis | • MES terminals with e-SOP access<br>• RFID verification readers |
| Operator Stations | Manual entry, monitoring, and SOP execution | • Operator login/logout tracking<br>• Task confirmation<br>• Quality check inputs | • MES-enabled HMI<br>• Badge/RFID-based operator login |

---

## Data modeling and workflow configuration

### Data modeling

Following ISA-95 guidelines, the production process was modelled as a series of hierarchical operations. MES data modeling is centered around the production unit, which is composed of interconnected entities including production orders, materials, machines, tools, operators, quality checks, and events. Each entity is modelled with unique identifiers and attributes that are linked through relational and event-driven associations. For instance, a production order object references master data imported from ERP (e.g., part number, BoM, routing), and is associated with machine parameters (e.g., press ID, stroke count), operator logins, and inspection records across the production lifecycle.

The material model includes raw material batch IDs, barcode tags, and BoM mapping, enabling real-time validation and consumption tracking. This ensures material traceability from goods receipt to final product declaration. The machine model integrates PLC signals such as stroke count, force, and downtime codes, which are continuously logged with time stamps. These are mapped against tool usage models that track die IDs, usage cycles, and maintenance status.

A critical part of the data modeling strategy involves event-based logging, wherein discrete events such as operator login, first-piece approval, downtime start/end, and quality inspections trigger workflows within MES. These workflows are configured using conditional logic and escalation hierarchies. For example, a mismatch in tool ID versus routing triggers a system-level interlock and prompts an alert to the supervisor. Similarly, excess downtime duration triggers a maintenance escalation workflow. The data model is also extended to support quality and rework tracking. Inspection results are recorded against each part, including defect type, image evidence (if available), inspection station, and disposition status (OK/NG/Rework). This enables correlation between machine parameters and quality outcomes for root cause analysis. All these elements are stored within the MES historian or operational database in a normalized schema to ensure efficient querying, reporting, and integration with analytics platforms. Data normalization also supports batch-wise reconciliation and seamless synchronization with ERP systems, particularly during production order closure and material reconciliation.

### Workflow configuration

The MES workflow configuration integrates Master Data such as part numbers, BoM, routing, and tool IDs with real-time Transactional Data, including stroke counts, downtimes, and inspections. Configured workflows enable rule-based execution, traceability, alerts, and interlocks, ensuring that every production activity aligns with defined standards and is digitally recorded for analytics.

**Master Data configuration:** Accurate configuration of MES master data ensures synchronization between enterprise planning and shop floor execution in automotive stamping. In a green field setup, structured master data enables automated decision-making, real-time traceability, and interlocks. Table 5 summarizes critical MES master data entities required during initial configuration, including material, tooling, routing, operators, and quality attributes essential for achieving operational accuracy and compliance.

**Table 5** Master data entities for MES configuration in automotive stamping.

| Master Data Entity | Description |
|---|---|
| Material master | Raw material and finished component part numbers, descriptions, Unit of Measures (UoMs), weight |
| Bill of materials | Mapping of raw materials, blanks, and tooling required per finished part |
| Tooling master | Die/tool identifiers, life cycle data, press compatibility |
| Routing/process plan | Sequence of operations (press hits, inspection) for each part |
| Work centre definitions | Mapping of tandem press stations, inspection gates, destacker, conveyors |
| Operator master | Operator IDs, skill matrix, authorization levels |
| Shift schedule | Planned shift timings, working calendar, planned maintenance slots |
| Defect codes library | Standardized quality defect codes linked with QMS system |

**Transactional data configuration:** Transactional data serves as the execution backbone of MES, capturing real-time machine and operator interactions across the stamping process. Configured workflows govern each production stage from ERP-driven job initiation to final inspection and order closure is structured through a workflow-based configuration within MES ensuring traceability, compliance, and data integrity. Table 6 outlines the MES transactional workflow configured for tandem press operations. This includes barcode validations, RFID-based tooling checks, PLC-driven data capture, downtime logging, quality checkpoints, rework tracking, and ERP integration.

**Table 6** MES-driven transactional workflow and data flow in tandem press operations.

| Step No. | MES process stage | Transactional data configuration workflow |
|---|---|---|
| 1 | Production order initiation | ERP creates production order → Sent to MES via API → MES generates job ticket with part specs, quantity, tool ID, routing plan |
| 2 | Material verification and loading | Operator scans blank material barcode → MES checks against BoM → If valid, material consumed is recorded; if invalid, interlock triggers and alert is shown |
| 3 | Tooling setup and validation | RFID reads die/tool ID → MES checks against routing → If matched, stroke allowed; if not, system blocks operation with warning |
| 4 | Operator login | Operator logs in via MES terminal → ID, shift, center, and job recorded → Used for traceability, authorization, and performance metrics |
| 5 | Press operation (Cycle execution) | PLC sends stroke count, force, cycle time → MES logs each part with timestamp, press ID, die ID, tool life, parameters → Data sent to historian |
| 6 | Downtime management | PLC flags downtime → MES auto-logs reason, duration, operator, station → Triggers escalation if downtime exceeds threshold |
| 7 | In-process quality check | Defects flagged via vision/operator → MES logs type, image (if any), press number, part ID, and rework/rejection code |
| 8 | Rework and scrap tracking | Rework/scrap tagging → MES updates WIP and yield → Logs scrap reason, responsible station/operator |
| 9 | Final inspection & dispatch ready | Final barcode scan → MES logs completion → Captures material batch, tool ID, stroke data, operator ID, and defect status, Print FG sticker |
| 10 | Production order closure | MES auto-closes job after quantity met → Sends summary to ERP → Generates OEE, yield, downtime, and quality reports |

---

## Training and change management

Implementing MES in a green field environment allowed system design without legacy constraints but posed challenges related to user readiness and behavioral change. A structured change management approach was adopted to drive adoption across the tandem press line.

A three-tier training framework addressed the roles of operators, supervisors, and engineering teams. Operators received hands-on training using a simulated MES environment with dummy job orders. They learned to operate MES terminals, log downtime, perform quality checks, and scan barcodes for material and tooling verification. Simulations of real scenarios, such as die mismatches and inspection failures, were used to build confidence. Supervisors were trained to manage exceptions and interpret live dashboards. They learned to track Work-In-Process (WIP), analyze OEE trends, manage shift approvals, and handle escalations. Their training emphasized proactive decision-making using MES data. Engineering and maintenance personnel received advanced sessions on MES configuration, PLC signal mapping, traceability linkages, and historian server diagnostics. This enabled them to troubleshoot system issues and optimize performance.

To support adoption, the program involved cross-functional champions from production, IT, and quality. On-floor quick guides, a dedicated helpdesk, and tiered support ensured readiness. Cultural alignment was encouraged through leadership floor walks and town halls, which highlighted MES as a tool for empowerment and process improvement. This multi-layered training and communication approach ensured that all stakeholders were prepared to engage with the MES platform effectively, laying a strong foundation for sustained digital transformation.

---

## Commissioning and go-live protocol

A structured, phased MES commissioning and go-live plan was executed for the green field tandem press line to ensure robust system validation, smooth module-wise rollout, and post-deployment stability, as depicted in Table 7, which outlines the key stages and success metrics.

**Table 7** MES commissioning phases with success indicators.

| Phase | Key activities | Outcomes / Success criteria |
|---|---|---|
| Pre-commissioning | • System Integration Testing (SIT): ERP ↔ MES ← PLC data flow<br>• Input/Output mapping via OPC UA<br>• Device & historian sync checks | • Data integrity across systems<br>• Signal verification success |
| Dry run & simulation | • Mock production orders<br>• Operator logins, defect triggers, dashboard updates | • Digital flow mirrors physical stamping<br>• Alerts & escalations work |
| Phase 1: Production monitoring | • Machine connectivity<br>• Operator log & ERP job dispatch | • 4 presses report strokes<br>• >95% operator tracking |
| Phase 2: Downtime & maintenance | • PLC/manual downtime tagging<br>• Preventive Maintenance (PM) logging & alerts | • 100% stoppage logs |
| Phase 3: Quality management | • Digital checklists<br>• Vision-based defect capture | • 90% inspections logged<br>• QMS-linked alerts |
| Phase 4: Traceability & analytics | • Serial traceability<br>• Historian & dashboard sync | • End-to-end part traceability<br>• <1% data mismatch |
| Post go-live stabilization | • MES control room<br>• Tiered support<br>• Daily feedback loops & audits | • UX issues resolved fast<br>• System resilience confirmed |

---

## Data collection and evaluation metrics

To evaluate the impact of MES implementation on the tandem press line, a set of quantitative KPIs were monitored over a continuous period of seven months from September 2024 to March 2025 followed by quarterly evaluations post-stabilization. This phase aligned with the commissioning and steady-state operation of the MES system.

Data was collected primarily through automated, timestamped MES reports, enabling structured analysis of real-time production behavior. The selected KPIs focused on three core areas: production efficiency, quality control, and digital traceability critical dimensions for modern automotive stamping operations. Table 8 summarizes the KPIs used, their target values by Month 7, global benchmarks, and justification for inclusion.

**Table 8** KPI targets and measurement approach for evaluating MES effectiveness.

| KPI | Description | Target by month 7 | Global benchmark | Measurement method | Justification |
|---|---|---|---|---|---|
| OEE | Composite of availability, performance, and quality | >70% | ≥ 75% (85%+ for world-class) | MES Dashboard | Industry standard for automated stamping lines. 85%+ is considered world-class [28]. |
| Changeover time | Duration of die and coil changes | < 30 minutes | < 20 minutes | MES Timestamp Logs | Lean goal is SMED (<10 mins); realistic for tandem lines with auto-die changers. |
| Defect rate (PPM) | Percentage of defective parts produced | < 2% | < 1.5% [29] | MES Quality Module | For Class A panels, this is aggressive but expected in high-precision stamping. |
| Traceability | % of parts with complete linked production data | 100% | 100% | MES Traceability Reports | Essential for compliance (IATF 16949, OEM requirements); no compromise standard. |

OEE served as the primary performance indicator, representing a composite measure of availability, performance, and quality. Changeover Time captured die setup durations using MES timestamps, reflecting SOP adherence and setup efficiency. Defect Rate percentage was tracked using the MES quality module to ensure tight control over product quality. Lastly, Traceability completeness measured the extent of digital linkage between each part and its associated production attributes, supporting regulatory compliance and root cause analysis.

### Statistical analysis

To move beyond descriptive comparisons and quantitatively evaluate the improvements attributed to MES implementation, a suite of statistical analyses was applied to the KPI dataset collected over the seven-month study period. Simple linear regression was performed to model the trajectory of each primary KPI (OEE, defect rate, and changeover time) against time (measured in months). The slope of each regression line quantified the monthly rate of change, while the coefficient of determination (R²) indicated the proportion of variance in each KPI explained by the progression of time and MES maturity. Statistical significance of each regression model was assessed using p-values, with p < 0.05 considered significant. Pearson's correlation coefficient (r) was calculated to measure the strength and direction of relationships between key operational variables. Specifically, correlations were tested between unplanned downtime and OEE, and between planned downtime and availability. Statistical significance was determined to ensure that observed relationships were not due to random variation.

For metrics where high-frequency data was available (e.g., individual changeover times), standard deviations were computed for the initial and final months to assess reductions in variability. This provided an indication of improved process consistency and SOP adherence following MES deployment. All statistical analyses were conducted using Microsoft Excel (trendline regression, correlation, and descriptive statistics) and verified in Python (SciPy and statsmodels libraries, version 3.10). A significance level of α = 0.05 was adopted, with p < 0.05 considered statistically significant.

---

## Results and discussion

This section presents and discusses the results of implementing a MES in a green field automotive stamping facility, specifically focusing on a Tandem Press line. The findings span the first seven months post-commissioning and encompass KPIs, process stability, digital maturity, and user adaptation. The discussion also includes insights into the early challenges and opportunities unique to green field MES deployments.

### Production stabilization through MES integration

The first notable observation was the rapid stabilization of production variables during the initial ramp-up period. Unlike brown field implementations - where MES must be aligned to pre-existing workflows - the green field context allowed MES-driven workflows to be embedded into SOPs from day one. As a result, there was early convergence of process parameters such as die alignment precision, press stroke timing, and changeover sequences. Table 9 presents the sample constituents supporting MES SOP compliance rate. These tasks were tracked via MES terminals, HMI input, RFID scans, and PLC signals.

**Table 9** Constituents Supporting MES SOP Compliance Rate.

| Sr. No. | MES SOP checkpoint / Task | Example logged event |
|---|---|---|
| 1 | Operator login/logout via MES terminal | Operator ID login/logout timestamp |
| 2 | Raw Material (RM) barcode scanning before press operation | Valid RM batch ID scanned |
| 3 | Tool/die RFID verification before press start | Die ID matched with routing |
| 4 | First-piece quality checklist submission | Digital checklist filled and approved |
| 5 | In-process quality checks at required intervals | Checkpoint entries during cycle |
| 6 | Recording of downtime and reason via MES | Downtime code logged from HMI or PLC |
| 7 | End-of-batch declaration (OK/NG/scrap reporting) | Batch completion declared on MES |
| 8 | Execution of e-SOP during die/tool changeover | e-SOP steps checked off by operator |
| 9 | Task confirmation for critical steps (press start, inspection) | Task marked as complete in MES |

To support and calculate the MES SOP Compliance rate, the constituents (compliance indicators) were identified gradually that reflect operator adherence to MES-driven SOPs. These are specific MES-logged activities or checkpoints that must be completed correctly in a production shift or batch.

A MES compliance report was prepared as shown in Figure 6, that includes monthly data for total expected SOP events and logged compliant events to determine the compliance rate (%) for all seven months. MES data showed a sharp increase in SOP compliance as operator familiarity and system integration matured. Within the first 4 months, the stamping line achieved 90% compliance with digital SOPs logged through MES terminals. Operator errors related to RM blank loading, die mismatches, and inspection check sheet were reduced significantly due to the built-in MES enforcement logic.

> **[Figure 6 – combined line chart; left axis "Events" 0–1400, right axis "Compliance Rate (%)" 0–100; x-axis "Month". Data table printed under the chart:]**
>
> | Series | Sep. 24 | Oct. 24 | Nov. 24 | Dec. 24 | Jan. 25 | Feb. 25 | Mar. 25 |
> |---|---|---|---|---|---|---|---|
> | Total Expected SOP Events | 1071 | 1073 | 1093 | 1121 | 1139 | 1204 | 1236 |
> | Compliant Events Logged | 450 | 622 | 798 | 1009 | 1059 | 1144 | 1187 |
> | Compliance Rate (%) | 42.02 | 57.97 | 73.01 | 90.01 | 92.98 | 95.02 | 96.04 |

**Figure 6** Monthly MES compliance rate for SOPs (Sep. 24 –Mar. 25).

Ideally, the total expected SOP events should remain constant if the line configuration, number of shifts, stations, and product mix stay unchanged. However, in the present green field MES deployment, a gradual increase in total expected SOP events was observed during the initial months due to the reasons as mentioned in Table 10.

**Table 10** Reasons and justifications for increasing total expected SOP events (in early months).

| Reason | Explanation |
|---|---|
| 1. Progressive MES module enablement | Initially, only a subset of MES features (e.g., operator login, barcode scanning) were enabled. Over time, new checkpoints (e.g., e-SOPs, downtime categorization) were added to the SOP framework. This increased the number of expected events. |
| 2. Product Mix diversification | Initially, the line stamped a single part number. Over time, more part numbers with complex routing and additional checks (e.g., critical-to-quality validations) were introduced, raising expected SOP events. |
| 3. Workforce expansion | More operators or additional shifts were gradually deployed, each generating their own login/logout, inspection, and task completion events. |
| 4. MES policy maturity | The organization defined more detailed or stricter SOP compliance policies as confidence in the system grown, adding new required checkpoints for each production run. |

Stabilization in the number of total expected SOP events is expected to occur once key elements of the production setup are fully in place. This will include the complete commissioning of the tandem press line, ensuring that all stations are operational and integrated into the MES framework. The activation of all planned MES modules will further contribute to defining a consistent set of expected events, covering production, quality, and traceability functions. As the product mix becomes more predictable and stable, fewer changes will be needed in the SOP structure. Finalization of SOP templates and their uniform implementation across the line will help establish a standardized event framework. Additionally, once operator training is completed and roles are clearly defined and assigned, MES logging behavior is anticipated to become consistent. Collectively, these developments will lead to a plateau in the number of total expected SOP events. However, this stabilized state may remain dynamic in the long term and could change if there are significant process modifications, introduction of new product variants, or further MES enhancements.

Even after stabilization is achieved, the number of total expected SOP events may not remain static indefinitely. It is likely to fluctuate in response to evolving production requirements and operational changes. The introduction of new part families with distinct inspection or control requirements will necessitate updates to the MES workflows, thereby increasing the number of expected events. Similarly, process re-engineering activities - such as the addition of new inspection steps or checkpoints - will introduce additional SOP logging instances. Regulatory compliance updates, including those driven by standards such as IATF or customer-specific audit mandates, will also influence the SOP framework by requiring more detailed data capture and validation procedures. Furthermore, automation upgrades involving the integration of new devices or sensors into the MES architecture will result in additional points of interaction and data logging. Consequently, even in a stabilized system, the Total Expected SOP Events will continue to reflect the dynamic nature of manufacturing operations and the pursuit of continuous improvement.

### OEE improvement and downtime analysis

Changeover time, one of the critical area within OEE, was optimized through MES integration. Traditionally, changeover in stamping includes tasks such as die removal, die installation and clamping, and feeder/transfer reconfiguration, which can be operator-dependent and variable in duration. Table 11 presents the average changeover time scenario over the seven months compared with pre-MES estimate. With MES-enabled e-SOPs and guided workflows, these processes became repeatable and digitally verified.

**Table 11** Average changeover time (minutes) before and after MES optimization.

| Sr. No. | Task | Pre-MES Estimate | Month 3 (Nov. 24) | Month 5 (Jan. 25) | Month 7 (Mar. 25) |
|---|---|---|---|---|---|
| 1 | Die removal | 17 | 15 | 13 | 11 |
| 2 | Die installation and clamping | 23 | 19 | 16 | 14 |
| 3 | Feeder/transfer reconfiguration | 16 | 14 | 12 | 10 |
| 4 | Total Changeover Time = (1) + (2) + (3) | 56 | 48 | 41 | 35 |

The cumulative average changeover time decreased by 37.5% over 7 months. MES checklists ensured every step was logged and verified, minimizing delays and standardizing performance across operators. A central performance metric monitored was OEE, which comprises Availability, Performance, and Quality. Figure 7 depicts the OEE metrics over seven months of production (Sep. 24 –Mar. 25). MES dashboards provided real-time OEE tracking, enabling supervisors to make prompt decisions regarding equipment utilization and maintenance interventions.

Table 12 provides the comprehensive details of major polling elements through MES from various check points contributing to planned production time, planned downtime, unplanned downtime, operating time, availability, performance, quality and OEE. This represents the breakdown of major downtime contributors as logged automatically via MES-PLC integration. The check points contributing to calculation of OEE, its factors and sub-factors with their flow of information is presented in Figure 8. Between September 2024 and March 2025, the OEE showed a significant improvement of more than 25 percentage points, increasing from 47.17% to 72.36%. This upward trend was largely attributed to several key factors. The implementation of MES-triggered maintenance alerts led to a noticeable reduction in total downtime (from 42% to 23%), unplanned downtime (from 51.99% to 45%), enabling timely interventions and minimizing disruptions.

> **[Figure 7 – line chart, y-axis "Percentage (%)" 45.00–100.00, x-axis "Month". Data table printed under the chart:]**
>
> | Series | Sep. 24 | Oct. 24 | Nov. 24 | Dec. 24 | Jan. 25 | Feb. 25 | Mar. 25 |
> |---|---|---|---|---|---|---|---|
> | Availability (%) | 58.00 | 64.19 | 71.49 | 72.98 | 75.15 | 76.29 | 76.88 |
> | Performance (%) | 88.62 | 92.93 | 92.20 | 93.77 | 92.98 | 96.23 | 95.89 |
> | Quality (%) | 91.77 | 95.06 | 96.80 | 97.88 | 98.39 | 98.39 | 98.15 |
> | OEE (%) | 47.17 | 56.70 | 63.80 | 66.98 | 68.75 | 72.20 | 72.36 |

**Figure 7** OEE Metrics over seven months of production (Sep. 24 –Mar. 25).

Additionally, improvements in part flow coordination and optimized die change procedures enhanced production continuity and reduced idle time. Standardized inspection protocols also contributed to the positive shift by lowering scrap rates and ensuring consistent quality control throughout the stamping process. Collectively, these developments played a pivotal role in achieving sustained gains in operational efficiency.

**Table 12** Month-wise OEE calculation through breakdown of various contributors.

| Sr. No. | KPI | Sep-24 | Oct-24 | Nov-24 | Dec-24 | Jan-25 | Feb-25 | Mar-25 |
|---|---|---|---|---|---|---|---|---|
| 1 | Total calendar days | 20 | 22 | 24 | 25 | 25 | 24 | 26 |
| 2 | No. of shifts | 1 | 1 | 2 | 2 | 3 | 3 | 3 |
| 3 | Hours per shift | 8 | 8 | 8 | 8 | 8 | 8 | 8 |
| 4 | Planned production time (min) = (1) × (2) × (3) × 60 | 9600 | 10560 | 23040 | 24000 | 36000 | 34560 | 37440 |
| 5 | Planned downtime - PD (min) = ∑ Polling elements for PD | 1532.2 | 1399.3 | 2364.8 | 2269.8 | 3041.3 | 2707.3 | 2770.2 |

*Polling elements for PD:* PD-01 - Software/IT maintenance (min), PD-02 - Lack of work (min), PD-03 - Learning and meeting (min), PD-04 - Preventive maintenance (min), PD-05 - Process-related downtime (min), PD-06 - TPM/5S activities (min), PD-07 - Quality inspections (min)

| Sr. No. | KPI | Sep-24 | Oct-24 | Nov-24 | Dec-24 | Jan-25 | Feb-25 | Mar-25 |
|---|---|---|---|---|---|---|---|---|
| 6 | Unplanned Downtime - UD (min) = ∑ Polling elements for UD | 2096.6 | 1928.8 | 3284.5 | 3177.7 | 4293.6 | 3855.9 | 3895.7 |
| | % UD = [(6) ÷ (8)] × 100 | 51.99 | 50.99 | 50.00 | 49.00 | 48.00 | 47.00 | 45.00 |

*Polling elements for UD:* UD-01 - Quality-related issues (min), UD-02 - Logistics delays (min), UD-03 - Maintenance-related downtime (min), UD-04 - Die/Tool changeover (min), UD-05 - Process-related downtime (min), UD-06 - Tool and die failure (min), UD-07 - Material shortage/Issues (min), UD-08 - Utility failure (power, air, water, etc.) (min)

| Sr. No. | KPI | Sep-24 | Oct-24 | Nov-24 | Dec-24 | Jan-25 | Feb-25 | Mar-25 |
|---|---|---|---|---|---|---|---|---|
| 7 | Minor stoppage (min) | 403.2 | 453.8 | 919.7 | 1037.6 | 1610.1 | 1640.8 | 1991.1 |
| 8 | Total downtime (min) = (5) + (6) + (7) | 4032 | 3782 | 6569 | 6485 | 8945 | 8204 | 8657 |
| 9 | Total downtime (%) = [(8) ÷ (4)] × 100 | 42% | 36% | 29% | 27% | 25% | 24% | 23% |
| 10 | Operating time (min) = (4) − (8) | 5568 | 6778 | 16471 | 17515 | 27055 | 26356 | 28783 |
| 11 | Total parts (Ideal) = (10) × Theoretical strokes per minute × parts per stroke | 52846 | 65018 | 89745 | 112816 | 164384 | 152600 | 204749 |
| 12 | Actual parts produced | 46832 | 60420 | 82742 | 105784 | 152852 | 146840 | 196340 |
| 13 | Defective parts | 3852 | 2984 | 2648 | 2241 | 2468 | 2358 | 3785 |
| 14 | Defect rate (%) = [(13) ÷ (12)] × 100 | 8.22 | 4.94 | 3.20 | 2.11 | 1.62 | 1.60 | 1.93 |
| 15 | First pass yield (FPY) (%) = 1 − [(14) ÷ 100] | 91.88 | 95.06 | 96.80 | 97.89 | 98.38 | 98.40 | 98.07 |
| 16 | Availability (%) = [(10) ÷ (4)] × 100 | 58.00 | 64.19 | 71.49 | 72.98 | 75.15 | 76.29 | 76.88 |
| 17 | Performance (%) = [(12) ÷ (11)] × 100 | 88.62 | 92.93 | 92.20 | 93.77 | 92.98 | 96.23 | 95.89 |
| 18 | Quality (%) = {[(12) − (13)] ÷ (12)} × 100 | 91.77 | 95.06 | 96.80 | 97.88 | 98.39 | 98.39 | 98.15 |
| 19 | OEE (%) = (16) × (17) × (18) | 47.17 | 56.70 | 63.80 | 66.98 | 68.75 | 72.20 | 72.36 |

*(Note: in the original, Table 12 is split across pages 37–38 with the "Polling elements" notes interleaved; the rows are shown here as one continuous sequence split only where those notes occur. Minus/plus signs in formulas were lost in the PDF text layer and restored from the numeric values.)*

> **[Figure 8 – block diagram of OEE calculation check points]**
> Swimlanes: **ERP**, **MES Calculation Engine**, **Automation and Orchestration**, **Manual Interaction with MES**.
> - ERP inputs: Total Calendar Days; No. of Shifts; Part per stroke; Theoretical SPM.
> - MES Calculation Engine: Planned Production Time (min); Operating Time (min); Availability (%); Performance (%); Quality (%); OEE (%); Total Downtime (min); Total Parts (Ideal).
> - Automation and Orchestration: Unplanned Downtime (min) – UD-03, UD04, UD06, UD08; Minor Stoppage (min); Actual Parts Produced.
> - Manual Interaction with MES: Planned Downtime (min); Unplanned Downtime (min) – UD01, UD02, UD05, UD07; Scrap Parts.

**Figure 8** Check points contributing to calculation of OEE, its factors and sub-factors with their flow of information.

The observed month-on-month increase in OEE from September 2024 to March 2025 reflects the progressive stabilization of production processes following MES integration in the green field tandem press line. In the early months, lower OEE values were expected due to initial commissioning activities, operator learning curves, unoptimized workflows, and the gradual activation of MES modules. As MES-driven maintenance alerts began reducing unplanned downtime, and digital SOP compliance improved, availability and performance metrics saw steady enhancement. Concurrently, better part flow management, tooling optimization, and the introduction of standardized quality checks contributed to reduced scrap rates, further boosting the quality component of OEE.

The increasing trend indicates ongoing improvements in operational discipline, system responsiveness, and data-driven decision-making. OEE is expected to approach a stable value once key factors such as consistent product mix, complete MES functionality rollout, mature operator proficiency, and steady upstream supply conditions are achieved. However, it is important to note that OEE may not plateau permanently. It can fluctuate in response to changes such as the introduction of new product variants, modifications in process design, machine wear and tear, or upgrades in automation and tooling. Therefore, while a stable OEE range may be reached in the near term, it will remain dynamic over time, reflective of the continuous improvement culture and operational variability inherent in discrete manufacturing.

The MES downtime module captured over 90% of identifiable or classified stoppages through direct integration with press-line PLCs. These downtimes were automatically categorized into die setting delays, material jams, sensor faults, and quality rejections. This level of granularity enabled focused root cause analysis. The remaining 10% were captured as 'line stop' due to non-availability of type of classification. The remaining 10% of stoppages that were not captured or classified by the MES downtime module likely correspond to events that fall outside the scope of automatic detection or require human input for accurate categorization. These may include ambiguous or compound stoppage causes that do not have discrete PLC signal representations, such as material unavailability due to upstream supply delays, operator absenteeism, or unexpected manual interventions. Additionally, short-duration micro-stoppages that fall below the PLC logging threshold or involve transient sensor errors may also go unrecorded. In some cases, delays related to auxiliary equipment (e.g., conveyor jams or inspection station holds) may not be integrated directly with the MES, thereby escaping automatic classification. Furthermore, human errors in manual logging or failure to confirm downtime reasons via MES terminals may also contribute to this gap.

To address this residual category, future improvements could include enhanced sensor coverage, tighter integration of peripheral systems, improved SOP enforcement for manual entries, and the use of AI/ML algorithms to infer likely root causes from contextual data such as operator logs, production flow anomalies, and energy consumption patterns.

### Quality and defect traceability

The MES quality module was configured to interface with both visual inspection terminals and in-line sensors, enabling real-time defect tagging and categorization. MES recorded defects such as wrinkles, splits, and misfeeds, with traceability back to specific die sets, RM batches, and even operator ID. Table 12, item number 14, from previous section, provides the details of the monthly defect rate. Decline in overall defect rate over time is clearly seen.

By Month 7 (March 2025), the defect rate decreased from 8.22% to 1.93%, a 76.52% reduction. In-process inspection records stored in MES were linked with part serial numbers, enabling traceability reports for Original Equipment Manufacturer (OEM) customers and supporting internal quality audits. This end-to-end traceability was especially valuable in identifying systematic issues during repeat orders and informing maintenance schedules. Unlike paper-based or delayed reporting systems, MES provided real-time alerts when defect trends crossed defined thresholds.

The implementation of MES played a significant role in improving quality control and defect traceability in the green field automotive stamping facility. During the initial phase, specifically in September and October 2024, quality metrics remained relatively low. This was mainly due to undocumented rejections, limited traceability, and reliance on manual defect recording. The deployment of digital check sheets in September and the introduction of first-piece inspection workflows in October marked the beginning of structured quality enforcement within the MES framework. These features ensured that standard quality checks were followed and inspection data was recorded in real time, reducing subjectivity and omissions.

By November 2024, MES was further enhanced with shift-wise and batch-wise traceability, allowing production and quality teams to link defects to specific time windows and material inputs. In December, rejection dashboards with tool correlation were added, which helped in identifying whether certain dies or tools were consistently linked to recurring defects. This correlation enabled quicker root cause identification and corrective actions. In January 2025, MES began issuing defect trend alerts, enabling supervisors to detect patterns early and take preventive steps. As a result, by January, the First Pass Yield (FPY) and overall quality levels stabilized around 98%, reflecting improved process reliability.

In February 2025, corrective action tracking was integrated into MES logs, allowing teams to document, review, and verify the closure of non-conformities systematically. Despite a rise in production volume in March 2025, the plant was able to sustain the high quality levels. This was largely due to the successful integration of MES with the preventive die maintenance module, which enabled timely maintenance based on tool usage data. This integration significantly reduced tooling-related defects and maintained consistency in stamped part quality. Overall, MES transformed quality management from a reactive to a proactive discipline by enabling real-time visibility, structured inspections, and data-driven interventions.

The slight increase in the defect rate during March 2025, rising to 1.93% from 1.60% in February, can be attributed to a transitional phase in the quality improvement process. Although the integration of the preventive die maintenance module into the MES was completed in March, its full impact on defect reduction was not immediate. During initial implementation, the system required time to accumulate sufficient tool usage data and correlate it with defect patterns. As a result, while the module was operational, it was still in the early stages of generating actionable maintenance alerts.

Additionally, the corrective action tracking feature, implemented in February, helped in documenting and monitoring non-conformities. However, closing these actions often requires coordinated efforts between production, quality, and maintenance teams, which may take more than one cycle to show measurable results. Thus, the observed rise in March could reflect residual issues from February that were still being addressed or new issues identified through improved traceability and monitoring capabilities.

### Operator and supervisor feedback

To complement the quantitative performance metrics, qualitative feedback was gathered from key shop floor stakeholders - namely machine operators, line supervisors, and maintenance personnel. The objective was to capture their perceptions of the newly implemented MES in a green field tandem press operation and assess its impact on day-to-day usability and trust.

A structured questionnaire was administered at two different intervals: one month post-implementation and after seven months of continued MES usage. The questionnaire evaluated four critical dimensions: (i) System Usability, (ii) Effectiveness of Training Provided, (iii) Usefulness of Real-Time Data, and (iv) Trust in MES-Generated Data Compared to Manual Records. Responses were recorded using a standard five-point Likert scale, where 1 indicated strong disagreement and 5 indicated strong agreement. Table 13 summarizes the average scores for each metric across the two timeframes.

**Table 13** Summary of Operator, Supervisor and Maintenance Personnel Feedback Analysis (Likert Scale: 1–5).

| Metric | Average Score (After Month 1 i.e. in Oct. 24) | Average Score (After Month 7 i.e. in Apr. 25) |
|---|---|---|
| Ease of Use | 3.4 | 4.2 |
| Training Adequacy | 3.1 | 4.5 |
| System Reliability | 3.6 | 4.7 |
| Data Trust | 3.2 | 4.6 |

The data reveals a notable improvement in user perception over time, particularly in training adequacy and trust in MES data. The steady increase across all four metrics shows a positive trend. In green field digital transformation projects, initial user resistance is common, especially when the workforce has prior experience in non-MES environments. However, this resistance can be reduced. Targeted user training and the use of an intuitive, user-friendly interface help users adapt more easily to the new system. These findings support the argument that successful MES adoption on the shop floor not only depends on technical configuration but also on change management strategies focused on human factors.

### Statistical validation

As outlined in Materials and Methods Section, statistical analysis as presented in Table 14 were performed to validate the significance of the observed KPI improvements following MES implementation. Regression analysis confirmed a strong and statistically significant upward trend in OEE, with a slope of +4.29% per month (p < 0.001, R² = 0.916). This indicates that 91.6% of the variation in OEE can be explained by the progression of time and MES maturity. A significant negative trend was observed in defect rate, decreasing at an average rate of –1.13% per month (p < 0.001, R² = 0.942). The high coefficient of determination demonstrates that 94.2% of the reduction in defect rate was explained by time, highlighting the effect of MES-driven quality monitoring and traceability. Changeover time showed a pronounced negative trend, with an average reduction of –3.54 minutes per month (p < 0.001, R² = 0.984). The very high R² value suggests that MES-enabled digital SOPs and structured workflows contributed to consistent and predictable reductions in setup time, with 98.4% of the variance explained by time.

Pearson correlation analysis revealed a strong negative relationship between OEE and unplanned downtime (r = –0.92, p < 0.01), confirming that reductions in downtime directly enhanced performance. Similarly, a strong negative correlation was observed between availability and planned downtime (r = –0.88, p < 0.01), demonstrating that MES-driven planning and scheduling optimization contributed to improved equipment utilization. Together, these results provide clear statistical evidence that the operational improvements following MES implementation were significant, consistent, and attributable to the system rather than random variation.

**Table 14** Summary of statistical analysis to validate the significance of the observed KPI improvements following MES implementation.

| Metric & Analysis | Result | Value | p-value | Interpretation |
|---|---|---|---|---|
| OEE trend (vs. Time) | Slope | +4.29 %/month | < 0.001 | Significant positive trend |
| | R² | 0.916 | | Time explains 91.6% of variance |
| Defect rate trend (vs. Time) | Slope | –1.13 %/month | < 0.001 | Significant negative trend |
| | R² | 0.942 | | Time explains 94.2% of variance |
| Changeover time trend (vs. Time) | Slope | –3.54 min/month | < 0.001 | Significant negative trend |
| | R² | 0.984 | | Time explains 98.4% of variance |
| Correlation: OEE vs. Unplanned downtime | r | –0.92 | < 0.01 | Strong negative relationship |
| Correlation: Availability vs. Planned downtime | r | –0.88 | < 0.01 | Strong negative relationship |

### Digital maturity and strategic benefits

While the primary objective of the MES implementation was to improve operational efficiency, its long-term impact extended into the strategic domain, accelerating the stamping plant's journey toward digital maturity and Industry 4.0 alignment. Figure 9 shows the MES-driven digital maturity roadmap for the stamping plant by highlighting the stages and achievements for the green field stamping operations.

From Day 1, the plant established foundational digital capabilities. End-to-end traceability of materials, machine performance, and human interventions enabled real-time visibility and faster root-cause analysis. The transition to a paperless production environment, encompassing quality checklists, maintenance logs, and production reports, improved data accuracy and decision-making while reducing manual errors.

> **[Figure 9 – roadmap graphic with ten sequential steps]**
> 1. **Identify Need for Digital Solutions** – Recognizing the need for advanced digital solutions in automotive manufacturing
> 2. **Select MES for Implementation** – Choosing MES as the solution to bridge planning and execution gaps
> 3. **Conduct Case Study** – Performing a case study at a Tier-1 automotive component plant
> 4. **Collect Data** – Gathering data through observations, logs, and interviews
> 5. **Analyze Performance Metrics** – Evaluating performance metrics before and after MES implementation
> 6. **Observe Downtime Reduction** – Noting a 13.47% reduction in unplanned downtime
> 7. **Improve OEE** – Achieving a 25% point improvement in overall equipment effectiveness
> 8. **Achieve Traceability** – Achieving 100% traceability
> 9. **Integrate MES into Operations** – Strategically deploying MES for green field stamping operations
> 10. **Achieve Digital Transformation** – Validating MES as a pivotal tool for digital transformation

**Figure 9** MES-Driven Digital Maturity Roadmap for the Stamping Plant.

Seamless real-time integration between MES and ERP enabled automatic job order execution, material consumption tracking, and batch-wise reconciliation, thereby improving inventory accuracy and reducing administrative overhead. Additionally, the system leveraged stroke count data and machine alarm histories collected via PLCs to initiate condition-based maintenance alerts, minimizing unplanned downtime and improving equipment availability.

These achievements laid a scalable digital foundation for future strategic advancements. With access to clean, structured data, the plant can now adopt advanced analytics to monitor bottlenecks, assess operator performance, and analyze shift-wise productivity. Quality data, linked with machine and operator parameters, supports the deployment of AI-driven models for predictive quality management.

The improvements observed in OEE, defect reduction, and changeover performance can also be framed through the lens of digital transformation maturity. According to maturity models, organizations typically progress from initial adoption to integration and then *optimization*. In our case, the green field deployment of MES allowed the plant to bypass legacy resistance, embedding standardized digital workflows from the outset. This positioned the facility at an accelerated maturity stage compared to typical brown field implementations. Furthermore, in line with technology adoption theory, the findings illustrate how organizational readiness, system integration, and user training collectively reduced barriers to adoption, enabling trust in MES data and long-term scalability. By situating the results within these frameworks, the study contributes not only to industrial best practice but also to the academic discourse on digital transformation pathways.

The MES's modular architecture allows for future integration with Industrial Internet of Things (IIoT) platforms, enabling capabilities such as energy monitoring, asset tracking, and factory-wide intelligence. Furthermore, standardized data structures support the future implementation of digital twins for virtual process simulation and optimization [30-32].

By embedding digital systems into its core processes from inception, the plant not only enhanced operational performance but also built strategic agility positioning itself to adopt emerging technologies as they evolve.

---

## Conclusion

The successful implementation of a MES in a green field automotive stamping facility, centered around a Tandem Press line, provides compelling evidence of the transformative potential of integrating digital systems from the inception of industrial operations. This study demonstrates how embedding MES during the plant design and commissioning phases - not as a post-deployment add-on but as a foundational component - can significantly enhance operational performance, enable real-time process control, and accelerate digital maturity.

The most significant outcomes of the MES implementation include measurable improvements in key performance indicators such as Overall Equipment Effectiveness (OEE), changeover time, defect rate, and traceability. By the end of seventh month of production, the OEE improved by 25 percentage points, changeover times were reduced by 37.5 %, and defect rates declined by 76.52%. In addition, 100% traceability was achieved from Day One, linking each stamped part to its material batch, die ID, operator, and press stroke data. These achievements underscore the strategic value of designing digital systems in tandem with physical processes in a green field setup.

In addition to descriptive KPI tracking, the improvements observed in OEE, defect rate, and changeover time were statistically validated. Regression analyses confirmed significant positive and negative trends (p < 0.001) with high explanatory power (R² > 0.90), while correlation analyses established strong relationships between unplanned downtime and OEE, and between planned downtime and availability (p < 0.01). These findings demonstrate that the operational gains attributed to MES implementation were not only observable but also statistically significant, reinforcing the robustness and reliability of the study's outcomes.

The early availability of accurate, real-time production data enabled proactive decision-making and continuous process improvement. MES served not only as a transactional system but also as a knowledge engine that provided visibility, accountability, and standardization across shifts and departments. Furthermore, operator and supervisor feedback revealed high levels of user acceptance, trust in system data, and improvements in procedural compliance demonstrating the system's effectiveness as a change management tool.

From an academic standpoint, this research adds to the limited but growing body of literature that addresses MES deployment in green field manufacturing environments. Unlike brown field projects, where MES is layered onto pre-existing processes, the green field context offers a blank slate to align MES capabilities directly with business objectives and operational workflows. This case study fills a critical research gap by offering a real-world account of how MES can be deployed as a digital backbone of an entirely new facility, using best practices in system design, data modeling, and human-machine interaction.

The research contribution of this work lies in documenting a replicable methodology for MES implementation in discrete manufacturing. It provides a structured approach covering MES platform selection, system architecture, workflow configuration, operator training, and commissioning protocols - all aligned to a green field execution model. These insights can guide manufacturing leaders, systems engineers, and digital transformation consultants planning similar implementations in other high-volume production sectors such as white goods, aerospace, or consumer electronics.

The improvement in OEE can be attributed to the way MES integrates monitoring, tracking, and control functions directly within the stamping line operations. By providing real-time visibility of production data, MES minimizes delays in detecting deviations, breakdowns, or quality issues, thereby reducing unplanned downtime. The system also enables more accurate scheduling, material availability tracking, and operator guidance, which collectively enhance machine utilization and throughput. Furthermore, MES ensures data-driven decision-making by automatically capturing production performance metrics and identifying bottlenecks, leading to systematic reduction of idle time and scrap. In the case of the tandem press line, these capabilities translated into higher availability, improved performance rates, and better quality consistency, ultimately contributing to the observed increase in OEE. Thus, MES not only serves as a monitoring tool but also actively drives operational excellence by synchronizing resources, streamlining workflows, and fostering continuous improvement.

Despite its success, this study is not without limitations. First, as this is a single-case study in one green field automotive stamping facility, the findings may not be directly generalizable to all manufacturing contexts. However, the approach or framework and methodology is generalizable irrespective of the business unit based on the KPIs. Second, the scope of MES evaluation was confined to the initial 7-month (Sept. 2024 – Mar. 2025) production period. While this timeframe was sufficient to capture stabilization trends and early gains, long-term sustainability and scalability of MES performance will require extended observation. Third, the study focused primarily on stamping operations; integration with upstream (coil preparation) - Blanking or downstream (welding, assembly) processes was not addressed. Additionally, advanced functionalities such as predictive quality, AI-driven scheduling, and mobile MES applications were not within the scope of this initial deployment phase.

Looking ahead, there is significant potential to build upon the digital foundation established through MES. Future work could explore integration with IIoT platforms to enable predictive maintenance and deeper energy monitoring, asset performance monitoring. Another promising direction is the application of machine learning algorithms on MES data to enhance process optimization and reduce cycle time variation. Moreover, expansion of MES to other areas of the plant, including warehouse and logistics operations, can yield end-to-end traceability and greater supply chain visibility. Integration with PLM and CRM systems also presents opportunities for broader digital convergence.

In conclusion, this study affirms that MES, when deployed as a core element of a green field manufacturing strategy, can act as a powerful enabler of smart, agile, and high-performance production systems. It elevates MES from an operational support tool to a strategic asset that drives quality, efficiency, and organizational learning from Day One. This case study not only delivers practical insights for industrial practitioners but also opens new avenues for academic exploration into the role of digital systems in shaping the future of manufacturing.

---

## References

1. Shojaeinasab A, Charter T, Jalayer M, Khadivi M, Ogunfowora O, Raiyani N, et al. Intelligent manufacturing execution systems: a systematic review. J Manuf Syst. 2022;62:503-22.
2. Jaskó S, Skrop A, Holczinger T, Chován T, Abonyi J. Development of manufacturing execution systems in accordance with Industry 4.0 requirements: a review of standard- and ontology-based methodologies and tools. Comput Ind. 2020;123:103300.
3. Saenz De Ugarte B, Artiba A, Pellerin R. Manufacturing execution system - a literature review. Prod Plan Control. 2009;20(6):525-39.
4. Seubert T, Vokey G. Manufacturing execution systems: an operations management approach. 2nd ed. North Carolina: International Society of Automation (ISA); 2023.
5. Henriques E, Pecas P, Silva A. Technology and manufacturing process selection: the product life cycle perspective. 1st ed. London: Springer; 2014.
6. Gašpar G, Budjač R, Valášek M, Bartoň M, Meravý T, Strémy M. Digitizing SMEs in the EU: a scalable model for retrofitting machinery to Industry 4.0. Appl Eng Sci. 2025;23:100230.
7. Jalo H, Pirkkalainen H. Effect of user resistance on the organizational adoption of extended reality technologies: a mixed methods study. Int J Inf Manag. 2024;75:102731.
8. Tuan-Anh T, Eigner G, Ruppert T, Abonyi J. Retrofitting-based development of brownfield Industry 4.0 and Industry 5.0 solutions. IEEE Access. 2022;10:64348–74.
9. Mantravadi S, Srai JS, Møller C. Application of MES/MOM for Industry 4.0 supply chains: a cross-case analysis. Comput Ind. 2023;148:103907.
10. Bachhav PD. Patil SM, Jadhav MS, Kene HD. Leveraging MES integration for operational excellence in a green field automotive stamping plant: a digital transformation case study. Int J Basic Appl Sci. 2025;14(4):808-17.
11. Kumar S. Automotive metal stamping market (2025 - 2030): size, share & trends analysis report by process (blanking, embossing, bending, coining, flanging), by application (passenger cars), by region, and segment forecasts. 1st ed. San Francisco: Grand View Research; 2025.
12. Da Silva B, Carneiro APA, Tepedino JOA, Filho JFS, Miranda F, Parpinelli RS. Automotive stamping process optimization using machine learning and multi-objective evolutionary algorithm. In: Abraham A, Pllana S, Casalino G, Ma K, Bajaj A, editors. Intelligent systems design and applications (ISDA 2022). Cham: Springer; 2023:351-60.
13. Roczek K, Fidali M, Rogala T, Krol A. A hybrid diagnostic system of main drive of industrial press line. Diagnostyka. 2021;22(1):85-92.
14. Nurdiyanto H, Kindiasari A. Critical role of manufacturing execution systems in digital transformation of manufacturing industry. J Electr Syst. 2024;20(7):2432-36.
15. Dhage SS. The evolution and impact of manufacturing execution systems in pharmaceutical manufacturing. World J Adv Res Rev. 2025;26(1):3494-500.
16. Michelon M. How the implementation of a manufacturing execution system can improve shop floor management and increase productivity. Revista Produção Online. 2023;22(2):2702-30.
17. Apilioğulları L. Digital transformation in project-based manufacturing: developing the ISA-95 model for vertical integration. Int J Prod Econ. 2022;245:108413.
18. Wang S, Krisch U. A foundation for building a data-driven culture. Appl Mark Anal. 2019;4(3):238-52.
19. Baptista LF, Barata J. Piloting Industry 4.0 in SMEs with RAMI 4.0: an enterprise architecture approach. Procedia Comput Sci. 2021;192:2826-35.
20. Nguyen TH, Le XC, Vu THL. An extended technology-organization-environment (TOE) framework for online retailing utilization in digital transformation: empirical evidence from Vietnam. J Open Innov: Technol Mark Complex. 2022;8(4):200.
21. Arief RK, Nurlaila Q, Armila A. Comparative study of conventional and quick die change stamping process: the issue of setup time and storage. Int J Eng Mater Manuf. 2018;3(4):216-23.
22. Troia S, Zorello LMM, Maier G. SD-WAN: how the control of the network can be shifted from core to edge. Proceedings of 2021 International Conference on Optical Network Design and Modeling (ONDM), 28 June 2021 - 01 July 2021, Gothenburg, Sweden: IEEE; 2021. p. 1-3.
23. Soepeno R. Comprehensive network analysis through a single main network architecture. Course Report. Tucson: University of Arizona, 2023.
24. Arogundade OR. Network security concepts, dangers, and defense best practical. Comput Eng Intell Syst. 2023;14(2):25-38.
25. Mazur DC, Entzminger RA, Morell PA, Kay JA, Syme E. Defining the industrial demilitarized zone and its benefits for mining applications. IEEE Trans Ind Appl. 2016;52(3):2731-36.
26. Beregi R, Pedone G, Háy B, Váncza J. Manufacturing execution system integration through the standardization of a common service model for cyber-physical production systems. Appl Sci. 2021;11(16):7581.
27. Zhang P, Li Z. Design and implementation of MES system based on industrial internet. ITM Web Conf. 2022;47:01016.
28. Ahire CP, Relkar AS. Correlating failure mode effect analysis (FMEA) & overall equipment effectiveness (OEE). Procedia Eng. 2012;38:3482-86.
29. Nugraha NW, Pancono S, Maulana GG. Defect detection system on stamping machine using the image processing method. Jurnal Rekayasa Elektrika. 2023;19(1):46-51.
30. Khamkar AD, Patil SM. Digital twin in fluid power: reviewing constituents. Int Res J Multidiscip Scope. 2024;5(1):750-65.
31. Khamkar AD, Patil SM. Digital twin in fluid power: review- technology trends. Int Res J Multidiscip Scope. 2024;5(2):596-610.
32. Khamkar AD, Patil SM. Digital twin in fluid power: review - uses and outlook. Int Res J Multidiscip Scope. 2024;5(3):79-96.