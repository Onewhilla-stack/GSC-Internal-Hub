--
-- PostgreSQL database dump
--

\restrict RKVgN0RwFebwYv2slJhLkWVaAcW0VeasagPFgfqnPp7SQ0A45RdTZQkalfz6OTN

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_log (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    username text NOT NULL,
    action text NOT NULL,
    record_type text NOT NULL,
    record_id integer,
    details text NOT NULL
);


ALTER TABLE public.activity_log OWNER TO postgres;

--
-- Name: activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_log_id_seq OWNER TO postgres;

--
-- Name: activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_log_id_seq OWNED BY public.activity_log.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    client_code text NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    location text,
    status text DEFAULT 'New'::text NOT NULL,
    notes text,
    first_visit_date text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    last_edited_by text,
    last_edited_at timestamp with time zone
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    date text NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    last_edited_by text,
    last_edited_at timestamp with time zone
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id integer NOT NULL,
    client_id integer,
    client_name text NOT NULL,
    date text NOT NULL,
    service_type text NOT NULL,
    description text,
    location text,
    amount numeric(12,2) NOT NULL,
    team_members integer DEFAULT 1 NOT NULL,
    wages numeric(12,2) NOT NULL,
    net_income numeric(12,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    last_edited_by text,
    last_edited_at timestamp with time zone,
    items jsonb
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: quotations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotations (
    id integer NOT NULL,
    quotation_number text NOT NULL,
    client_name text NOT NULL,
    location text,
    date text NOT NULL,
    expiry_date text,
    status text DEFAULT 'Pending'::text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    amount numeric(12,2) NOT NULL,
    notes text,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quotations OWNER TO postgres;

--
-- Name: quotations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quotations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quotations_id_seq OWNER TO postgres;

--
-- Name: quotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quotations_id_seq OWNED BY public.quotations.id;


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receipts (
    id integer NOT NULL,
    receipt_number text NOT NULL,
    job_id integer,
    client_name text NOT NULL,
    service_type text NOT NULL,
    description text,
    amount numeric(12,2) NOT NULL,
    date text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_status text DEFAULT 'Pending'::text NOT NULL,
    notes text,
    created_by text,
    last_edited_by text,
    last_edited_at timestamp with time zone,
    items jsonb,
    job_was_deleted boolean DEFAULT false NOT NULL
);


ALTER TABLE public.receipts OWNER TO postgres;

--
-- Name: receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.receipts_id_seq OWNER TO postgres;

--
-- Name: receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.receipts_id_seq OWNED BY public.receipts.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'director'::text NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: activity_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log ALTER COLUMN id SET DEFAULT nextval('public.activity_log_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: quotations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotations ALTER COLUMN id SET DEFAULT nextval('public.quotations_id_seq'::regclass);


--
-- Name: receipts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts ALTER COLUMN id SET DEFAULT nextval('public.receipts_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: activity_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_log (id, "timestamp", username, action, record_type, record_id, details) FROM stdin;
1	2026-06-02 17:04:26.915748+00	director1	Added	Job	35	General Cleaning for Audit Test Client on 2026-06-02 — KES 5000
2	2026-06-02 17:25:19.618899+00	deliction	Added	Receipt	1	GSC-RCT-001 for Test Client — KES 5000
3	2026-06-02 17:25:26.156285+00	deliction	Edited	Receipt	1	GSC-RCT-001 — status: Partial
4	2026-06-02 17:25:31.899196+00	deliction	Deleted	Receipt	1	GSC-RCT-001 for Test Client
5	2026-06-02 17:37:12.268571+00	deliction	Added	Receipt	2	GSC-RCT-001 for Jane Mwangi — KES 7000.00
6	2026-06-02 17:42:04.288675+00	deliction	Added	Receipt	3	GSC-RCT-002 for TestClient-1780422025055 — KES 4500.00
7	2026-06-02 20:12:26.502066+00	deliction	Added	Job	60	Multiple Services for Smoke Test Co on 2026-06-02 — KES 2300
8	2026-06-02 20:12:26.561664+00	deliction	Added	Job	61	Fumigation for Legacy Single on 2026-06-02 — KES 3000
9	2026-06-02 20:12:37.575336+00	deliction	Edited	Job	60	Laundry for Smoke Test Co on 2026-06-02
10	2026-06-02 20:12:37.634181+00	deliction	Deleted	Job	60	Laundry for Smoke Test Co on 2026-06-02
11	2026-06-02 20:12:37.691519+00	deliction	Deleted	Job	61	Fumigation for Legacy Single on 2026-06-02
12	2026-06-02 20:16:36.251585+00	deliction	Added	Job	62	Multiple Services for Patch Inv on 2026-06-02 — KES 2300
13	2026-06-02 20:16:36.513044+00	deliction	Edited	Job	62	Multiple Services for Patch Inv on 2026-06-02
14	2026-06-02 20:16:36.623768+00	deliction	Deleted	Job	62	Multiple Services for Patch Inv on 2026-06-02
15	2026-06-02 20:21:31.133144+00	deliction	Added	Job	63	Multiple Services for Link Test on 2026-06-02 — KES 1500
16	2026-06-02 20:21:31.263844+00	deliction	Added	Receipt	4	GSC-RCT-003 for Link Test — KES 1500.00
17	2026-06-02 20:21:31.597354+00	deliction	Deleted	Receipt	4	GSC-RCT-003 for Link Test
18	2026-06-02 20:21:31.658907+00	deliction	Deleted	Job	63	Multiple Services for Link Test on 2026-06-02
19	2026-06-03 11:27:03.952748+00	deliction	Added	Job	64	Multiple Services for Desc Test on 2026-06-03 — KES 3500
20	2026-06-03 11:27:04.108399+00	deliction	Added	Job	65	Laundry for Single Desc on 2026-06-03 — KES 800
21	2026-06-03 11:27:14.452322+00	deliction	Edited	Job	64	Duvet Cleaning for Desc Test on 2026-06-03
22	2026-06-03 11:27:14.53745+00	deliction	Deleted	Job	64	Duvet Cleaning for Desc Test on 2026-06-03
23	2026-06-03 11:27:14.588843+00	deliction	Deleted	Job	65	Laundry for Single Desc on 2026-06-03
24	2026-06-03 11:32:25.433862+00	associate	Added	Job	66	Multiple Services for Hillarious on 2026-06-03 — KES 0
25	2026-06-03 11:39:37.317975+00	deliction	Added	Job	67	Deep Cleaning for Autolab on 2026-06-03 — KES 4500
26	2026-06-03 11:42:11.272313+00	deliction	Added	Receipt	5	GSC-RCT-003 for Autolab — KES 4500.00
59	2026-06-03 11:56:36.441554+00	associate	Added	Job	68	Multiple Services for AMTTEST-1780487654002 on 2026-06-03 — KES 28100
60	2026-06-03 12:04:37.83424+00	deliction	Edited	Job	66	Multiple Services for Hillarious on 2026-06-03
61	2026-06-03 12:05:07.698514+00	associate	Added	Receipt	38	GSC-RCT-002 for AMTTEST-1780487654002 — KES 28100.00
62	2026-06-03 12:09:30.271738+00	associate	Edited	Receipt	38	GSC-RCT-002 — status: Partial
63	2026-06-03 12:09:39.336362+00	associate	Edited	Receipt	38	GSC-RCT-002 — status: Paid
64	2026-06-03 12:20:02.680232+00	deliction	Added	Client	38	AutoClient-1780489202 (GSC-038) — auto-added from visit
65	2026-06-03 12:20:02.688518+00	deliction	Added	Job	69	Carpet Cleaning for AutoClient-1780489202 on 2026-06-03 — KES 5000
66	2026-06-03 12:20:15.217178+00	deliction	Added	Job	70	Laundry for AutoClient-1780489202 on 2026-06-03 — KES 1500
67	2026-06-03 12:22:11.324891+00	deliction	Added	Client	39	UITEST-1780489273829 (GSC-038) — auto-added from visit
68	2026-06-03 12:22:11.332403+00	deliction	Added	Job	71	Laundry for UITEST-1780489273829 on 2026-06-03 — KES 3500
69	2026-06-03 12:23:46.126477+00	deliction	Added	Client	40	Postfix-1780489426 (GSC-039) — auto-added from visit
70	2026-06-03 12:23:46.134948+00	deliction	Added	Job	72	Laundry for Postfix-1780489426 on 2026-06-03 — KES 2000
71	2026-06-03 12:23:46.375038+00	deliction	Added	Job	73	Laundry for Totally Different Name 1780489426 on 2026-06-03 — KES 1000
72	2026-06-03 12:29:06.325975+00	associate	Added	Client	41	Bossie (GSC-038) — auto-added from visit
73	2026-06-03 12:29:06.334995+00	associate	Added	Job	74	Car Wash for Bossie on 2026-06-03 — KES 2333
74	2026-06-03 12:29:45.165802+00	deliction	Deleted	Client	41	Bossie (GSC-038)
75	2026-06-03 12:30:00.530269+00	deliction	Deleted	Receipt	38	GSC-RCT-002 for AMTTEST-1780487654002
76	2026-06-03 12:30:06.689708+00	deliction	Deleted	Receipt	2	GSC-RCT-001 for Jane Mwangi
77	2026-06-03 12:31:08.52698+00	associate	Added	Receipt	39	GSC-RCT-001 for Hillarious — KES 28100.00
78	2026-06-05 11:16:51.628285+00	deliction	Deleted	Job	79	Curtain Cleaning for Ben on 2026-05-30
79	2026-06-05 11:21:39.244569+00	deliction	Deleted	Job	74	Car Wash for Bossie on 2026-06-03
80	2026-06-08 11:39:44.021544+00	deliction	Added	Quotation	1	GSC-QTN-001 for Test Client — KES 12000.00
81	2026-06-08 11:40:02.499732+00	deliction	Deleted	Quotation	1	GSC-QTN-001 for Test Client
82	2026-06-08 11:44:03.319212+00	deliction	Added	Quotation	2	GSC-QTN-001 for Test Co — KES 5000.00
83	2026-06-08 11:44:03.917728+00	deliction	Edited	Quotation	2	GSC-QTN-001 — status: Accepted
84	2026-06-08 11:44:04.038474+00	deliction	Deleted	Quotation	2	GSC-QTN-001 for Test Co
85	2026-06-08 11:44:32.982668+00	deliction	Added	Quotation	3	GSC-QTN-001 for Test Co — KES 5000.00
86	2026-06-08 11:44:33.642604+00	deliction	Deleted	Quotation	3	GSC-QTN-001 for Test Co
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, client_code, name, phone, email, location, status, notes, first_visit_date, created_at, created_by, last_edited_by, last_edited_at) FROM stdin;
1	GSC-001	Viona	\N	\N	\N	Existing	\N	2026-05-18	2026-06-02 18:23:49.946053+00	\N	\N	\N
2	GSC-002	Nyachera	\N	\N	Bodega F1	Existing	\N	2026-05-02	2026-06-02 18:23:49.946053+00	\N	\N	\N
3	GSC-003	Sharon	\N	\N	Roysambu	Referral	\N	2026-05-13	2026-06-02 18:23:49.946053+00	\N	\N	\N
4	GSC-004	Weru	\N	\N	Jamhuri	New	\N	2026-05-22	2026-06-02 18:23:49.946053+00	\N	\N	\N
5	GSC-005	Rosey	\N	\N	Millers Court	Existing	\N	2026-05-14	2026-06-02 18:23:49.946053+00	\N	\N	\N
6	GSC-006	Mitchelle Michuku	\N	\N	\N	Existing	\N	2026-05-18	2026-06-02 18:23:49.946053+00	\N	\N	\N
7	GSC-007	Bugi	\N	\N	Lenana Fairview	Existing	\N	2026-05-05	2026-06-02 18:23:49.946053+00	\N	\N	\N
8	GSC-008	Phanice	\N	\N	Jamhuri	Existing	\N	2026-05-01	2026-06-02 18:23:49.946053+00	\N	\N	\N
9	GSC-009	Priscillah	\N	\N	Mideya	Existing	\N	2026-05-10	2026-06-02 18:23:49.946053+00	\N	\N	\N
10	GSC-010	Laban	\N	\N	Yellow Stone	Existing	\N	2026-05-05	2026-06-02 18:23:49.946053+00	\N	\N	\N
11	GSC-011	Beth	\N	\N	\N	Existing	\N	2026-05-07	2026-06-02 18:23:49.946053+00	\N	\N	\N
12	GSC-012	Fazil	\N	\N	\N	Existing	\N	2026-05-15	2026-06-02 18:23:49.946053+00	\N	\N	\N
13	GSC-013	Swaminarayan	\N	\N	Langata	Existing	\N	2026-05-06	2026-06-02 18:23:49.946053+00	\N	\N	\N
14	GSC-014	Wayua	\N	\N	Ngong Road	Existing	\N	2026-05-27	2026-06-02 18:23:49.946053+00	\N	\N	\N
15	GSC-015	Frank	\N	\N	Kinoo	Existing	\N	2026-05-05	2026-06-02 18:23:49.946053+00	\N	\N	\N
16	GSC-016	Hairmaster	\N	\N	Ngong Road	New	\N	2026-05-03	2026-06-02 18:23:49.946053+00	\N	\N	\N
17	GSC-017	Eunice	\N	\N	\N	Existing	\N	2026-05-18	2026-06-02 18:23:49.946053+00	\N	\N	\N
18	GSC-018	Cynthia	\N	\N	Jamhuri	Existing	\N	2026-05-14	2026-06-02 18:23:49.946053+00	\N	\N	\N
19	GSC-019	Autolab	\N	\N	Ngong Road	Existing	\N	2026-05-18	2026-06-02 18:23:49.946053+00	\N	\N	\N
20	GSC-020	Kim	\N	\N	Jamhuri	Existing	\N	2026-05-07	2026-06-02 18:23:49.946053+00	\N	\N	\N
21	GSC-021	Rachael	\N	\N	\N	Existing	\N	2026-05-05	2026-06-02 18:23:49.946053+00	\N	\N	\N
22	GSC-022	Brian	\N	\N	Wanye	Existing	\N	2026-05-11	2026-06-02 18:23:49.946053+00	\N	\N	\N
23	GSC-023	IAN	\N	\N	Karen	Existing	\N	2026-05-11	2026-06-02 18:23:49.946053+00	\N	\N	\N
24	GSC-024	Joy	\N	\N	\N	Existing	\N	2026-05-18	2026-06-02 18:23:49.946053+00	\N	\N	\N
25	GSC-025	Linet	\N	\N	Kawangware	Existing	\N	2026-05-25	2026-06-02 18:23:49.946053+00	\N	\N	\N
26	GSC-026	Maria	\N	\N	Parklands	New	\N	2026-05-04	2026-06-02 18:23:49.946053+00	\N	\N	\N
27	GSC-027	Tiz	\N	\N	Kileleshwa	Existing	\N	2026-05-12	2026-06-02 18:23:49.946053+00	\N	\N	\N
28	GSC-028	Peter Ngoe	\N	\N	Jamhuri	Existing	\N	2026-05-02	2026-06-02 18:23:49.946053+00	\N	\N	\N
29	GSC-029	Harison	\N	\N	\N	Existing	\N	2026-05-15	2026-06-02 18:23:49.946053+00	\N	\N	\N
30	GSC-030	Roy	\N	\N	Ngong Road	Existing	\N	2026-05-02	2026-06-02 18:23:49.946053+00	\N	\N	\N
31	GSC-031	Delly	\N	\N	\N	Existing	\N	2026-05-18	2026-06-02 18:23:49.946053+00	\N	\N	\N
32	GSC-032	Wakesho	\N	\N	\N	Existing	\N	2026-05-07	2026-06-02 18:23:49.946053+00	\N	\N	\N
33	GSC-033	Esther	\N	\N	Ndemi	Existing	\N	2026-05-16	2026-06-02 18:23:49.946053+00	\N	\N	\N
34	GSC-034	Razanah	\N	\N	Ngong Road	Existing	\N	2026-05-01	2026-06-02 18:23:49.946053+00	\N	\N	\N
35	GSC-035	Robery	\N	\N	\N	Existing	\N	2026-05-11	2026-06-02 18:23:49.946053+00	\N	\N	\N
36	GSC-036	Robert	\N	\N	Ndemi	Existing	\N	2026-05-27	2026-06-02 18:23:49.946053+00	\N	\N	\N
37	GSC-037	Bridgit	\N	\N	Royal Garden	Existing	\N	2026-05-06	2026-06-02 18:23:49.946053+00	\N	\N	\N
42	GSC-038	Hellen	\N	\N	Windgab	Existing	\N	2026-05-28	2026-06-04 10:56:35.739371+00	director1	\N	\N
43	GSC-039	Tevin	\N	\N	Waithaka	Existing	\N	2026-05-30	2026-06-04 10:56:35.739371+00	director1	\N	\N
44	GSC-040	Ben	\N	\N	Wanye	Existing	\N	2026-05-30	2026-06-04 10:56:35.739371+00	director1	\N	\N
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, date, category, description, amount, created_at, created_by, last_edited_by, last_edited_at) FROM stdin;
1	2026-05-16	Wi-Fi	Wifi	2000.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
2	2026-05-16	Tokens/Electricity	Tokens	600.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
3	2026-05-18	Labour	Labour	2400.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
4	2026-05-18	Tokens/Electricity	Token	1000.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
5	2026-05-18	Cleaning Supplies	Detergents	750.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
6	2026-05-18	Fumigation Chemicals	Lava (Insect)	1000.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
7	2026-05-19	Tokens/Electricity	Token	1000.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
8	2026-05-20	Tokens/Electricity	Token	1000.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
9	2026-05-26	Tokens/Electricity	Token	800.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
10	2026-05-26	Water	Water	900.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
11	2026-05-26	Cleaning Supplies	Rust Off (Toilet Cleaner)	1000.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
12	2026-05-27	Tokens/Electricity	Token	800.00	2026-06-02 18:23:49.946053+00	\N	\N	\N
13	2026-05-28	Equipment	GSC Tool	3000.00	2026-06-04 10:55:59.742392+00	director1	\N	\N
14	2026-05-28	Cleaning Supplies	Bright Force	1000.00	2026-06-04 10:55:59.742392+00	director1	\N	\N
15	2026-05-28	Tokens/Electricity	Tokens	3072.00	2026-06-04 10:55:59.742392+00	director1	\N	\N
16	2026-05-28	Cleaning Supplies	Omo/Jik	400.00	2026-06-04 10:55:59.742392+00	director1	\N	\N
17	2026-05-28	Cleaning Supplies	Multipurpose Soap	600.00	2026-06-04 10:55:59.742392+00	director1	\N	\N
18	2026-05-28	Fumigation Chemicals	Lava (Insect Killer)	1000.00	2026-06-04 10:55:59.742392+00	director1	\N	\N
19	2026-05-30	Labour	Advance - Machine Lady	4000.00	2026-06-04 10:55:59.742392+00	director1	\N	\N
20	2026-05-30	Transport	Transport	1000.00	2026-06-04 10:55:59.742392+00	director1	\N	\N
21	2026-06-01	Rent	Monthly Rent	25000.00	2026-06-04 21:09:48.880307+00	deliction	\N	\N
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, client_id, client_name, date, service_type, description, location, amount, team_members, wages, net_income, notes, created_at, created_by, last_edited_by, last_edited_at, items) FROM stdin;
75	\N	Hellen	2026-05-28	Deep Cleaning	House Cleaning, 4 BR	Windgab	1500.00	0	0.00	1500.00	\N	2026-06-04 10:55:54.896462+00	director1	\N	\N	\N
76	\N	Fazil	2026-05-29	Carpet Cleaning	Carpet Cleaning, 6x9x25	Ndemi Road	2700.00	0	0.00	2700.00	\N	2026-06-04 10:55:54.896462+00	director1	\N	\N	\N
77	\N	Roy	2026-05-30	Laundry	1st Load, 3 kgs	Ngong Road	300.00	0	0.00	300.00	\N	2026-06-04 10:55:54.896462+00	director1	\N	\N	\N
78	\N	Tevin	2026-05-30	Laundry	1st Load & Shoes, 6 kgs 6 pairs	Waithaka	2100.00	0	0.00	2100.00	\N	2026-06-04 10:55:54.896462+00	director1	\N	\N	\N
1	8	Phanice	2026-05-01	Laundry	3rd Load	Jamhuri	2000.00	0	0.00	2000.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
2	34	Razanah	2026-05-01	Laundry	1st Load	Ngong Road	200.00	0	0.00	200.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
3	2	Nyachera	2026-05-02	Carpet Cleaning	Carpet Cleaning	Bodega F1	2400.00	0	0.00	2400.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
4	2	Nyachera	2026-05-02	Laundry	2nd Load	Bodega F1	1200.00	0	0.00	1200.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
5	28	Peter Ngoe	2026-05-02	Laundry	1st Load	Jamhuri	400.00	0	0.00	400.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
6	30	Roy	2026-05-02	Laundry	1st Load	Ngong Road	300.00	0	0.00	300.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
7	16	Hairmaster	2026-05-03	Laundry	1st Load	Ngong Road	700.00	0	0.00	700.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
8	26	Maria	2026-05-04	Other	Toilet Cleaning	Parklands	1500.00	0	0.00	1500.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
9	7	Bugi	2026-05-05	Laundry	2nd Load	Lenana Fairview	1700.00	0	0.00	1700.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
10	10	Laban	2026-05-05	Sofa/Upholstery	Sofa Cleaning	Yellow Stone	3500.00	0	0.00	3500.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
11	15	Frank	2026-05-05	Sofa/Upholstery	Sofa Cleaning	Kinoo	2500.00	0	0.00	2500.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
12	21	Rachael	2026-05-05	Laundry	2nd Load	\N	1700.00	0	0.00	1700.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
13	2	Nyachera	2026-05-06	Carpet Cleaning	Carpet Cleaning	Ngando	1350.00	0	0.00	1350.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
14	13	Swaminarayan	2026-05-06	Fumigation	Fumigation	Langata	3000.00	0	0.00	3000.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
15	37	Bridgit	2026-05-06	Carpet Cleaning	Carpet Cleaning	Royal Garden	0.00	0	0.00	0.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
16	11	Beth	2026-05-07	Other	Floor Scrubbing	\N	3500.00	0	0.00	3500.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
17	20	Kim	2026-05-07	Laundry	2nd Load	Jamhuri	1900.00	0	0.00	1900.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
18	32	Wakesho	2026-05-07	Laundry	1st Load	\N	850.00	0	0.00	850.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
19	2	Nyachera	2026-05-10	Laundry	2nd Load	Ngando	1200.00	0	0.00	1200.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
20	8	Phanice	2026-05-10	Laundry	3rd Load	Jamhuri	2000.00	0	0.00	2000.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
21	9	Priscillah	2026-05-10	Sofa/Upholstery	Sofa Cleaning	Mideya	3600.00	0	0.00	3600.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
22	27	Tiz	2026-05-12	Carpet Cleaning	Carpet Cleaning	Kileleshwa	1350.00	0	0.00	1350.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
23	3	Sharon	2026-05-13	Deep Cleaning	Fumigation/Sofa Cleaning	Roysambu	8500.00	0	0.00	8500.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
24	5	Rosey	2026-05-14	Laundry	3rd Load	Millers Court	2100.00	0	0.00	2100.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
25	18	Cynthia	2026-05-14	Laundry	3rd Load	Jamhuri	2100.00	0	0.00	2100.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
26	8	Phanice	2026-05-15	Laundry	3rd Load	Jamhuri	2000.00	0	0.00	2000.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
27	12	Fazil	2026-05-15	Carpet Cleaning	Carpet Cleaning	\N	3100.00	0	0.00	3100.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
28	29	Harison	2026-05-15	Laundry	1st Load	\N	1000.00	0	0.00	1000.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
29	34	Razanah	2026-05-15	Laundry	1st Load	Ngong Road	150.00	0	0.00	150.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
30	2	Nyachera	2026-05-16	Laundry	2nd Load	Ngando	1200.00	0	0.00	1200.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
31	33	Esther	2026-05-16	Laundry	Duvet Cleaning	Ndemi	800.00	0	0.00	800.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
32	1	Viona	2026-05-18	Deep Cleaning	Sofa Cleaning & Carpet	\N	14400.00	0	0.00	14400.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
33	6	Mitchelle Michuku	2026-05-18	Fumigation	Fumigation	\N	6600.00	0	0.00	6600.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
34	7	Bugi	2026-05-18	Laundry	3rd Load & Duvet Cleaning	\N	4400.00	0	0.00	4400.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
35	17	Eunice	2026-05-18	Carpet Cleaning	Carpet Cleaning	\N	2225.00	0	0.00	2225.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
36	19	Autolab	2026-05-18	Laundry	2nd Load	\N	1000.00	0	0.00	1000.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
37	24	Joy	2026-05-18	Laundry	Curtains/Fleece Blanket	\N	1700.00	0	0.00	1700.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
38	31	Delly	2026-05-18	Carpet Cleaning	Carpet Cleaning	\N	875.00	0	0.00	875.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
39	5	Rosey	2026-05-19	Laundry	2nd Load	Millers Court	1500.00	0	0.00	1500.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
40	5	Rosey	2026-05-19	Laundry	Duvet Cleaning	Millers Court	1000.00	0	0.00	1000.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
41	30	Roy	2026-05-20	Laundry	1st Load	Ngong Road	300.00	0	0.00	300.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
42	5	Rosey	2026-05-21	Laundry	5 Duvets	Millers Court	3450.00	0	0.00	3450.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
43	28	Peter Ngoe	2026-05-21	Laundry	1st Load	Jamhuri	700.00	0	0.00	700.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
44	34	Razanah	2026-05-21	Laundry	1st Load	Ngong Road	100.00	0	0.00	100.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
45	4	Weru	2026-05-22	Laundry	10 Duvets	Jamhuri	6500.00	0	0.00	6500.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
46	4	Weru	2026-05-22	Laundry	6 Fleece Blankets	\N	1800.00	0	0.00	1800.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
47	2	Nyachera	2026-05-23	Laundry	2nd Load	Ngando	1200.00	0	0.00	1200.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
48	2	Nyachera	2026-05-23	Laundry	Duvet Cleaning	Ngando	800.00	0	0.00	800.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
49	16	Hairmaster	2026-05-23	Laundry	2nd Load	Ngong Road	1000.00	0	0.00	1000.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
50	25	Linet	2026-05-25	Laundry	Curtains/Duvets	Kawangware	1700.00	0	0.00	1700.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
51	19	Autolab	2026-05-26	Laundry	2nd Load	Ngong Road	1000.00	0	0.00	1000.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
52	14	Wayua	2026-05-27	Laundry	4th Load	Ngong Road	2800.00	0	0.00	2800.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
53	34	Razanah	2026-05-27	Laundry	1st Load	Ngong Road	200.00	0	0.00	200.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
54	36	Robert	2026-05-27	Laundry	2nd Load	Ndemi	500.00	0	0.00	500.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
55	16	Hairmaster	2026-05-11	Laundry	1st Load	Ngong Road	700.00	0	0.00	700.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
56	22	Brian	2026-05-11	Laundry	2nd Load	Wanye	1700.00	0	0.00	1700.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
57	23	IAN	2026-05-11	Laundry	2nd Load	Karen	1700.00	0	0.00	1700.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
58	30	Roy	2026-05-11	Laundry	1st Load	Ngong Road	300.00	0	0.00	300.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
59	35	Robery	2026-05-11	Laundry	1st Load	\N	500.00	0	0.00	500.00	\N	2026-06-02 18:23:49.946053+00	\N	\N	\N	\N
\.


--
-- Data for Name: quotations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quotations (id, quotation_number, client_name, location, date, expiry_date, status, items, amount, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receipts (id, receipt_number, job_id, client_name, service_type, description, amount, date, created_at, payment_status, notes, created_by, last_edited_by, last_edited_at, items, job_was_deleted) FROM stdin;
39	GSC-RCT-001	66	Hillarious	Multiple Services	\N	28100.00	2026-06-03	2026-06-03 12:31:08.521543+00	Pending		associate	\N	\N	[{"amount": 8100, "description": "", "serviceType": "Carpet Cleaning"}, {"amount": 20000, "description": "", "serviceType": "General Cleaning"}]	f
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (sid, sess, expire) FROM stdin;
PAo25fYw-_r7IY6X9itWzBoqJVJLrEpA	{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-12T11:16:28.555Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":2,"username":"deliction","role":"director"}	2026-06-12 11:16:29
JldvBzLmiwQaenxtmQJqYh9zxAkgqMMr	{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-12T11:16:51.525Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":2,"username":"deliction","role":"director"}	2026-06-12 11:16:52
rBE_FBDAY5-UcHVzCfYPZ7Y-YFk3u0qJ	{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-15T11:44:33.274Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":4,"username":"associate","role":"worker"}	2026-06-15 11:44:34
1wG2tS8OkDuwcHz_AJ848PN8cxE4dCPn	{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-15T11:39:27.854Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":2,"username":"deliction","role":"director"}	2026-06-15 11:40:03
KFxu1YstSzTlqS0ObN4wW43TI4FLPHNT	{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-15T11:44:32.909Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":2,"username":"deliction","role":"director"}	2026-06-15 11:44:34
0GfMDjKmlxXBr_CvnW-KIV23HDC-FoMU	{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-14T08:49:51.217Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":2,"username":"deliction","role":"director"}	2026-06-14 08:49:52
LNbJBSnFtAH4iy8tmNlRSodq7NCHnLn0	{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-15T11:44:03.239Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":2,"username":"deliction","role":"director"}	2026-06-15 11:44:05
iYG8C5FoD1f4XtCTfJg80-ZoirMBfeQh	{"cookie":{"originalMaxAge":604800000,"expires":"2026-06-15T13:25:11.087Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"userId":2,"username":"deliction","role":"director"}	2026-06-18 21:34:02
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.settings (key, value) FROM stdin;
wagePerPersonPerDay	1000
monthlyRent	25000
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, created_at, role) FROM stdin;
2	deliction	$2b$10$UJxNNmQYyt5ksQvlXRZcWe5u3Wt4WqH8eFIt1A1YJF0yZZQqR7BAK	2026-06-02 16:53:21.253841+00	director
3	whilla	$2b$10$UJxNNmQYyt5ksQvlXRZcWe5u3Wt4WqH8eFIt1A1YJF0yZZQqR7BAK	2026-06-02 16:53:22.601887+00	director
4	associate	$2b$10$rmkLDWrPb4ZcMTKyTbbUbeU95ve00GmkS9aQ/RyLje27zrI.F1Unq	2026-06-02 16:53:24.129867+00	worker
\.


--
-- Name: activity_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_log_id_seq', 86, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clients_id_seq', 44, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 21, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobs_id_seq', 79, true);


--
-- Name: quotations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quotations_id_seq', 3, true);


--
-- Name: receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.receipts_id_seq', 39, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: clients clients_client_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_client_code_unique UNIQUE (client_code);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);


--
-- Name: quotations quotations_quotation_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_quotation_number_key UNIQUE (quotation_number);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_receipt_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_receipt_number_unique UNIQUE (receipt_number);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- PostgreSQL database dump complete
--

\unrestrict RKVgN0RwFebwYv2slJhLkWVaAcW0VeasagPFgfqnPp7SQ0A45RdTZQkalfz6OTN

